const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { SPECIALTIES } = require("../constants/specialities");
const { APPOINTMENT_STATUSES } = require("../constants/appointment");
const { todayString } = require("../utils/slots");
const { isValidDateString, isValidObjectId, escapeRegex } = require("../utils/validators");

// ?page=2&limit=20 -> { page, limit, skip } with safe bounds
const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

const searchRegex = (search) =>
    typeof search === "string" && search.trim() ? new RegExp(escapeRegex(search.trim().slice(0, 50)), "i") : null;

// ---------- dashboard ----------

// Server's UTC offset as "+05:30" so MongoDB groups bookings by the same local day the app uses
const serverTimezoneOffset = () => {
    const minutes = -new Date().getTimezoneOffset();
    const sign = minutes >= 0 ? "+" : "-";
    const abs = Math.abs(minutes);
    return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

// Aggregated appointment numbers. Also used by the AI insights feature (no personal data inside).
const buildAppointmentStats = async () => {
    const DAYS = 14;
    const fromDate = todayString(-(DAYS - 1));

    const [statusCounts, specialtyCounts, dailyCounts] = await Promise.all([
        Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        // join each appointment with its doctor to count bookings per specialty
        Appointment.aggregate([
            { $lookup: { from: "doctors", localField: "doctor", foreignField: "_id", as: "doc" } },
            { $unwind: "$doc" },
            { $group: { _id: "$doc.specialty", count: { $sum: 1 } } }
        ]),
        // bookings made per day (by creation date) for the last 14 days
        Appointment.aggregate([
            { $match: { createdAt: { $gte: new Date(`${fromDate}T00:00:00`) } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: serverTimezoneOffset() } }, count: { $sum: 1 } } }
        ])
    ]);

    const byStatus = Object.fromEntries(APPOINTMENT_STATUSES.map((s) => [s, 0]));
    statusCounts.forEach((s) => { byStatus[s._id] = s.count; });

    const specialtyMap = Object.fromEntries(specialtyCounts.map((s) => [s._id, s.count]));
    const bySpecialty = SPECIALTIES.map((name) => ({ specialty: name, count: specialtyMap[name] || 0 }));

    const dailyMap = Object.fromEntries(dailyCounts.map((d) => [d._id, d.count]));
    const bookingsLast14Days = Array.from({ length: DAYS }, (_, i) => {
        const date = todayString(i - (DAYS - 1));
        return { date, count: dailyMap[date] || 0 };
    });

    return {
        totalAppointments: Object.values(byStatus).reduce((a, b) => a + b, 0),
        byStatus,
        bySpecialty,
        bookingsLast14Days
    };
};

// GET /api/admin/stats
const getDashboardStats = asyncHandler(async (req, res) => {
    const [totalPatients, totalDoctors, activeDoctors, appointmentStats, latestAppointments] = await Promise.all([
        User.countDocuments({ role: "patient" }),
        Doctor.countDocuments(),
        Doctor.countDocuments({ isActive: true }),
        buildAppointmentStats(),
        Appointment.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("doctor", "name specialty photo")
            .select("name date time status doctor createdAt")
    ]);

    res.json({
        success: true,
        stats: {
            totalPatients,
            totalDoctors,
            activeDoctors,
            ...appointmentStats,
            // "active" = still upcoming / not finished
            activeAppointments: appointmentStats.byStatus.booked + appointmentStats.byStatus.confirmed
        },
        latestAppointments
    });
});

// ---------- doctors ----------

// GET /api/admin/doctors?search=&specialty=&status=active|inactive
// Unlike the public list, this includes inactive doctors and contact details.
const getAllDoctors = asyncHandler(async (req, res) => {
    const filter = {};
    const regex = searchRegex(req.query.search);
    if (regex) filter.$or = [{ name: regex }, { email: regex }];
    if (req.query.specialty) {
        if (!SPECIALTIES.includes(req.query.specialty)) throw new AppError("Unknown specialty");
        filter.specialty = req.query.specialty;
    }
    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "inactive") filter.isActive = false;

    const doctors = await Doctor.find(filter).sort({ name: 1 });
    res.json({ success: true, count: doctors.length, doctors });
});

// GET /api/admin/doctors/:id  (full record for the edit form)
const getDoctorForAdmin = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id).populate("user", "email isActive");
    if (!doctor) throw new AppError("Doctor not found", 404);
    res.json({ success: true, doctor });
});

// ---------- users ----------

// GET /api/admin/users?search=&role=&status=active|inactive&page=&limit=
const getUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    const regex = searchRegex(req.query.search);
    if (regex) filter.$or = [{ name: regex }, { email: regex }];
    if (req.query.role) {
        if (!User.ROLES.includes(req.query.role)) throw new AppError("Invalid role filter");
        filter.role = req.query.role;
    }
    if (req.query.status === "active") filter.isActive = true;
    if (req.query.status === "inactive") filter.isActive = false;

    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        User.countDocuments(filter)
    ]);
    res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) || 1 });
});

// GET /api/admin/users/:id  -> profile + appointment summary + recent appointments
const getUserDetails = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);

    const [counts, recentAppointments] = await Promise.all([
        Appointment.aggregate([
            { $match: { user: user._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]),
        Appointment.find({ user: user._id })
            .sort({ date: -1, time: -1 })
            .limit(10)
            .populate("doctor", "name specialty")
            .select("date time status doctor fees")
    ]);
    const appointmentCounts = Object.fromEntries(APPOINTMENT_STATUSES.map((s) => [s, 0]));
    counts.forEach((c) => { appointmentCounts[c._id] = c.count; });

    res.json({ success: true, user, appointmentCounts, recentAppointments });
});

// PATCH /api/admin/users/:id/status  body: { isActive: true|false }
const setUserStatus = asyncHandler(async (req, res) => {
    if (typeof req.body.isActive !== "boolean") throw new AppError("isActive must be true or false");
    if (req.user._id.equals(req.params.id)) throw new AppError("You cannot change your own account status");

    const user = await User.findById(req.params.id);
    if (!user) throw new AppError("User not found", 404);
    if (user.role === "admin") throw new AppError("Admin accounts cannot be deactivated here", 403);

    user.isActive = req.body.isActive;
    await user.save();
    res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
});

// ---------- appointments ----------

// GET /api/admin/appointments?status=&doctor=&date=&from=&to=&search=&page=&limit=
// Status changes / cancellation reuse PATCH /api/appointments/:id/status and /cancel (admin is allowed there).
const getAllAppointments = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const { status, doctor, date, from, to } = req.query;
    const filter = {};

    if (status) {
        if (!APPOINTMENT_STATUSES.includes(status)) throw new AppError("Invalid status filter");
        filter.status = status;
    }
    if (doctor) {
        if (!isValidObjectId(doctor)) throw new AppError("Invalid doctor filter");
        filter.doctor = doctor;
    }
    if (date) {
        if (!isValidDateString(date)) throw new AppError("Date must be YYYY-MM-DD");
        filter.date = date;
    } else if (from || to) {
        if ((from && !isValidDateString(from)) || (to && !isValidDateString(to))) throw new AppError("Dates must be YYYY-MM-DD");
        filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
    }
    const regex = searchRegex(req.query.search);
    if (regex) filter.$or = [{ name: regex }, { email: regex }];

    const [appointments, total] = await Promise.all([
        Appointment.find(filter)
            .sort({ date: -1, time: -1 })
            .skip(skip)
            .limit(limit)
            .populate("doctor", "name specialty photo")
            .select("-isCancelled"),
        Appointment.countDocuments(filter)
    ]);
    res.json({ success: true, appointments, total, page, pages: Math.ceil(total / limit) || 1 });
});

module.exports = {
    getDashboardStats,
    getAllDoctors,
    getDoctorForAdmin,
    getUsers,
    getUserDetails,
    setUserStatus,
    getAllAppointments,
    buildAppointmentStats
};
