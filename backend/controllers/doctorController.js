const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { SPECIALTIES } = require("../constants/specialities");
const { generateSlots, weekdayOf, todayString, toMinutes } = require("../utils/slots");
const { parseAddress } = require("./userController");
const { MIN_PASSWORD_LENGTH } = require("./authController");
const {
    isNonEmptyString, isValidEmail, isValidDateString, isValidTimeString, escapeRegex
} = require("../utils/validators");

// Fields patients are allowed to see (no contact email/phone, no linked account id)
const PUBLIC_FIELDS = "name specialty photo degree experience fees about gender languages address available workingDays startTime endTime";

// ---------- helpers ----------

// Converts a multipart/JSON body into clean doctor fields. Only known fields are copied,
// so things like isActive or user can never be set through this body.
const parseDoctorBody = (body, { isCreate }) => {
    const data = {};
    const toBool = (v) => v === true || v === "true";
    const toList = (v) => (Array.isArray(v) ? v : String(v).split(",")).map((s) => String(s).trim()).filter(Boolean);

    if (body.name !== undefined || isCreate) {
        if (!isNonEmptyString(body.name, 100)) throw new AppError("Doctor name is required");
        data.name = body.name.trim();
    }
    if (body.specialty !== undefined || isCreate) {
        if (!SPECIALTIES.includes(body.specialty)) throw new AppError(`Specialty must be one of: ${SPECIALTIES.join(", ")}`);
        data.specialty = body.specialty;
    }
    if (body.fees !== undefined || isCreate) {
        const fees = Number(body.fees);
        if (!Number.isFinite(fees) || fees < 0 || fees > 100000) throw new AppError("Fees must be a valid number");
        data.fees = fees;
    }
    if (body.experience !== undefined) {
        const exp = Number(body.experience);
        if (!Number.isInteger(exp) || exp < 0 || exp > 70) throw new AppError("Experience must be a whole number of years");
        data.experience = exp;
    }
    if (body.email !== undefined && body.email !== "") {
        if (!isValidEmail(body.email)) throw new AppError("Invalid email");
        data.email = body.email.trim().toLowerCase();
    }
    ["phone", "degree", "about"].forEach((key) => {
        if (body[key] !== undefined) data[key] = String(body[key]).trim();
    });
    if (body.gender !== undefined) data.gender = body.gender; // enum checked by the model
    if (body.languages !== undefined) data.languages = toList(body.languages).slice(0, 10);
    if (body.available !== undefined) data.available = toBool(body.available);
    if (body.workingDays !== undefined) {
        const days = [...new Set(toList(body.workingDays).map(Number))];
        if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw new AppError("Working days must be numbers 0-6");
        data.workingDays = days.sort();
    }
    ["startTime", "endTime"].forEach((key) => {
        if (body[key] !== undefined) {
            if (!isValidTimeString(body[key])) throw new AppError(`${key} must be in HH:mm format`);
            data[key] = body[key];
        }
    });
    const address = parseAddress(body.address);
    if (address) data.address = address;

    return data;
};

const checkTimeRange = (doctor) => {
    if (toMinutes(doctor.startTime) >= toMinutes(doctor.endTime)) {
        throw new AppError("End time must be after start time");
    }
};

// ---------- public ----------

// GET /api/doctors?specialty=&search=&available=true&date=YYYY-MM-DD&gender=
// Search + filters. Only active doctors are ever returned to the public.
const getDoctors = asyncHandler(async (req, res) => {
    const { specialty, search, available, date, gender } = req.query;
    const filter = { isActive: true };

    if (specialty) {
        if (typeof specialty !== "string" || !SPECIALTIES.includes(specialty)) throw new AppError("Unknown specialty");
        filter.specialty = specialty;
    }
    if (typeof search === "string" && search.trim()) {
        const regex = new RegExp(escapeRegex(search.trim().slice(0, 50)), "i");
        filter.$or = [{ name: regex }, { specialty: regex }];
    }
    if (available === "true") filter.available = true;
    if (date) {
        if (!isValidDateString(date)) throw new AppError("Date must be YYYY-MM-DD");
        filter.workingDays = weekdayOf(date); // doctor works on that weekday
    }
    if (typeof gender === "string" && gender) filter.gender = gender;

    const doctors = await Doctor.find(filter).select(PUBLIC_FIELDS).sort({ experience: -1, name: 1 });
    res.json({ success: true, count: doctors.length, doctors });
});

// GET /api/doctors/specialties  -> controlled list + number of active doctors in each
const getSpecialties = asyncHandler(async (req, res) => {
    const counts = await Doctor.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$specialty", count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    res.json({
        success: true,
        specialties: SPECIALTIES.map((name) => ({ name, doctorCount: countMap[name] || 0 }))
    });
});

// GET /api/doctors/:id
const getDoctorById = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true }).select(PUBLIC_FIELDS);
    if (!doctor) throw new AppError("Doctor not found", 404);
    res.json({ success: true, doctor });
});

// GET /api/doctors/:id/slots?date=YYYY-MM-DD  -> every slot of that day and whether it is free
const getDoctorSlots = asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!isValidDateString(date)) throw new AppError("Date must be YYYY-MM-DD");

    const doctor = await Doctor.findOne({ _id: req.params.id, isActive: true });
    if (!doctor) throw new AppError("Doctor not found", 404);

    if (!doctor.available || !doctor.workingDays.includes(weekdayOf(date)) || date < todayString()) {
        return res.json({ success: true, date, slots: [] });
    }

    const booked = await Appointment.find({ doctor: doctor._id, date, isCancelled: false }).select("time");
    const bookedTimes = new Set(booked.map((a) => a.time));

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday = date === todayString();

    const slots = generateSlots(doctor.startTime, doctor.endTime)
        .filter((time) => !isToday || toMinutes(time) > nowMinutes) // hide past slots today
        .map((time) => ({ time, isBooked: bookedTimes.has(time) }));

    res.json({ success: true, date, slots });
});

// ---------- admin ----------

// POST /api/doctors  (admin, multipart with optional "image" file)
// If accountPassword is provided, a login account with role "doctor" is created as well.
const createDoctor = asyncHandler(async (req, res) => {
    const data = parseDoctorBody(req.body, { isCreate: true });
    if (req.file) data.photo = `/uploads/doctors/${req.file.filename}`;

    const { accountPassword } = req.body;
    let account = null;
    if (accountPassword) {
        if (!data.email) throw new AppError("Email is required to create a doctor login account");
        if (typeof accountPassword !== "string" || accountPassword.length < MIN_PASSWORD_LENGTH) {
            throw new AppError(`Account password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }
        if (await User.exists({ email: data.email })) throw new AppError("A user with this email already exists", 409);
        account = await User.create({ name: data.name, email: data.email, password: accountPassword, role: "doctor" });
        data.user = account._id;
    }

    const doctor = new Doctor(data);
    checkTimeRange(doctor);
    try {
        await doctor.save();
    } catch (err) {
        if (account) await User.deleteOne({ _id: account._id }); // don't leave an orphan account
        throw err;
    }
    res.status(201).json({ success: true, message: "Doctor added", doctor });
});

// PUT /api/doctors/:id  (admin)
const updateDoctor = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) throw new AppError("Doctor not found", 404);

    const data = parseDoctorBody(req.body, { isCreate: false });
    if (req.file) data.photo = `/uploads/doctors/${req.file.filename}`;
    doctor.set(data);
    checkTimeRange(doctor);
    await doctor.save();

    // keep the doctor's login account name/email in sync
    if (doctor.user && (data.name || data.email)) {
        await User.updateOne({ _id: doctor.user }, { $set: { name: doctor.name, ...(data.email && { email: data.email }) } });
    }
    res.json({ success: true, message: "Doctor updated", doctor });
});

// PATCH /api/doctors/:id/status  (admin)  body: { isActive: true|false }
const setDoctorStatus = asyncHandler(async (req, res) => {
    if (typeof req.body.isActive !== "boolean") throw new AppError("isActive must be true or false");
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
    if (!doctor) throw new AppError("Doctor not found", 404);
    res.json({ success: true, message: `Doctor ${doctor.isActive ? "activated" : "deactivated"}`, doctor });
});

// DELETE /api/doctors/:id  (admin)
// A doctor with appointment history is NOT deleted (that would break patients' records) -
// the admin should deactivate them instead.
const deleteDoctor = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) throw new AppError("Doctor not found", 404);

    if (await Appointment.exists({ doctor: doctor._id })) {
        throw new AppError("This doctor has appointment history. Deactivate the doctor instead of deleting.", 409);
    }
    if (doctor.user) await User.deleteOne({ _id: doctor.user });
    await doctor.deleteOne();
    res.json({ success: true, message: "Doctor deleted" });
});

// ---------- logged-in doctor ----------

const findOwnDoctorProfile = async (userId) => {
    const doctor = await Doctor.findOne({ user: userId });
    if (!doctor) throw new AppError("No doctor profile is linked to this account", 404);
    return doctor;
};

// GET /api/doctors/me/profile  (doctor)
const getMyDoctorProfile = asyncHandler(async (req, res) => {
    res.json({ success: true, doctor: await findOwnDoctorProfile(req.user._id) });
});

// PUT /api/doctors/me/profile  (doctor) - a doctor can edit practical details but NOT name/specialty
const updateMyDoctorProfile = asyncHandler(async (req, res) => {
    const doctor = await findOwnDoctorProfile(req.user._id);
    const editable = ["about", "fees", "phone", "languages", "address", "available", "workingDays", "startTime", "endTime"];
    const body = Object.fromEntries(Object.entries(req.body).filter(([key]) => editable.includes(key)));

    doctor.set(parseDoctorBody(body, { isCreate: false }));
    checkTimeRange(doctor);
    await doctor.save();
    res.json({ success: true, message: "Profile updated", doctor });
});

module.exports = {
    getDoctors,
    getSpecialties,
    getDoctorById,
    getDoctorSlots,
    createDoctor,
    updateDoctor,
    setDoctorStatus,
    deleteDoctor,
    getMyDoctorProfile,
    updateMyDoctorProfile,
    findOwnDoctorProfile,
    PUBLIC_FIELDS
};
