const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { ALLOWED_TRANSITIONS, APPOINTMENT_STATUSES, MAX_DAYS_AHEAD } = require("../constants/appointment");
const { generateSlots, weekdayOf, todayString, toMinutes } = require("../utils/slots");
const { isValidObjectId, isValidDateString, isValidTimeString } = require("../utils/validators");
const { findOwnDoctorProfile } = require("./doctorController");

const DOCTOR_FIELDS_FOR_PATIENT = "name specialty photo degree fees address";

// ---------- helpers ----------

// Loads an appointment and checks that the logged-in user is allowed to see/change it:
// the patient who booked it, the doctor it is with, or an admin.
const loadAppointmentForUser = async (req) => {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) throw new AppError("Appointment not found", 404);

    const { role, _id } = req.user;
    if (role === "admin") return appointment;
    if (role === "patient" && appointment.user.equals(_id)) return appointment;
    if (role === "doctor") {
        const doctor = await Doctor.findOne({ user: _id }).select("_id");
        if (doctor && appointment.doctor.equals(doctor._id)) return appointment;
    }
    // 404 instead of 403 so users can't probe which appointment ids exist
    throw new AppError("Appointment not found", 404);
};

const appointmentStartsInFuture = (appointment) => {
    const now = new Date();
    const today = todayString();
    if (appointment.date !== today) return appointment.date > today;
    return toMinutes(appointment.time) > now.getHours() * 60 + now.getMinutes();
};

// ---------- patient ----------

// POST /api/appointments  (patient)  body: { doctorId, date: "YYYY-MM-DD", time: "HH:mm", reason?, phone? }
const createAppointment = asyncHandler(async (req, res) => {
    const doctorId = req.body.doctorId || req.body.doctor; // "doctor" kept for backward compatibility
    const { date, time, reason, phone } = req.body;

    if (!isValidObjectId(doctorId)) throw new AppError("Invalid doctor");
    if (!isValidDateString(date)) throw new AppError("Please choose a valid date");
    if (!isValidTimeString(time)) throw new AppError("Please choose a valid time slot");

    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
    if (!doctor) throw new AppError("Doctor not found", 404);
    if (!doctor.available) throw new AppError("This doctor is not accepting appointments right now");

    // ---- date / time validation ----
    // "YYYY-MM-DD" strings compare correctly as plain text
    if (date < todayString()) throw new AppError("You cannot book an appointment in the past");
    if (date > todayString(MAX_DAYS_AHEAD)) throw new AppError(`Appointments can be booked up to ${MAX_DAYS_AHEAD} days ahead`);
    if (!doctor.workingDays.includes(weekdayOf(date))) throw new AppError("The doctor does not work on this day");
    if (!generateSlots(doctor.startTime, doctor.endTime).includes(time)) {
        throw new AppError("This time is outside the doctor's working hours");
    }
    if (!appointmentStartsInFuture({ date, time })) throw new AppError("This time slot has already passed");

    // ---- double booking ----
    // 1) the doctor's slot (also enforced by the unique DB index, which handles simultaneous requests)
    if (await Appointment.exists({ doctor: doctor._id, date, time, isCancelled: false })) {
        throw new AppError("This time slot is already booked. Please choose another slot.", 409);
    }
    // 2) the same patient can't be in two appointments at the same time
    if (await Appointment.exists({ user: req.user._id, date, time, isCancelled: false })) {
        throw new AppError("You already have another appointment at this time", 409);
    }

    const appointment = await Appointment.create({
        user: req.user._id,
        doctor: doctor._id,
        name: req.user.name,
        email: req.user.email,
        phone: typeof phone === "string" && phone.trim() ? phone.trim().slice(0, 20) : req.user.phone,
        date,
        time,
        reason: typeof reason === "string" ? reason.trim().slice(0, 500) : "",
        fees: doctor.fees
    });

    res.status(201).json({ success: true, message: "Appointment booked", appointment });
});

// GET /api/appointments  (patient) -> the logged-in patient's own appointments
const getMyAppointments = asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({ user: req.user._id })
        .populate("doctor", DOCTOR_FIELDS_FOR_PATIENT)
        .sort({ date: -1, time: -1 });
    res.json({ success: true, appointments });
});

// ---------- doctor ----------

// GET /api/appointments/doctor?status=&date=  (doctor) -> appointments with the logged-in doctor
const getDoctorAppointments = asyncHandler(async (req, res) => {
    const doctor = await findOwnDoctorProfile(req.user._id);
    const filter = { doctor: doctor._id };

    if (req.query.status) {
        if (!APPOINTMENT_STATUSES.includes(req.query.status)) throw new AppError("Invalid status filter");
        filter.status = req.query.status;
    }
    if (req.query.date) {
        if (!isValidDateString(req.query.date)) throw new AppError("Date must be YYYY-MM-DD");
        filter.date = req.query.date;
    }

    const appointments = await Appointment.find(filter)
        .select("-isCancelled")
        .sort({ date: 1, time: 1 });
    res.json({ success: true, appointments });
});

// ---------- shared (patient / doctor / admin, with ownership checks) ----------

// GET /api/appointments/:id
const getAppointmentById = asyncHandler(async (req, res) => {
    const appointment = await loadAppointmentForUser(req);
    await appointment.populate("doctor", DOCTOR_FIELDS_FOR_PATIENT);
    res.json({ success: true, appointment });
});

// PATCH /api/appointments/:id/cancel
const cancelAppointment = asyncHandler(async (req, res) => {
    const appointment = await loadAppointmentForUser(req);

    if (!ALLOWED_TRANSITIONS[appointment.status].includes("cancelled")) {
        throw new AppError(`A ${appointment.status} appointment cannot be cancelled`);
    }
    if (req.user.role === "patient" && !appointmentStartsInFuture(appointment)) {
        throw new AppError("Past appointments cannot be cancelled");
    }

    appointment.status = "cancelled";
    appointment.cancelledBy = req.user.role;
    await appointment.save();
    res.json({ success: true, message: "Appointment cancelled", appointment });
});

// PATCH /api/appointments/:id/status  (doctor of this appointment, or admin)  body: { status }
const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!APPOINTMENT_STATUSES.includes(status)) {
        throw new AppError(`Status must be one of: ${APPOINTMENT_STATUSES.join(", ")}`);
    }

    const appointment = await loadAppointmentForUser(req);
    if (!ALLOWED_TRANSITIONS[appointment.status].includes(status)) {
        throw new AppError(`Cannot change status from ${appointment.status} to ${status}`);
    }
    if (status === "completed" && appointmentStartsInFuture(appointment)) {
        throw new AppError("An appointment can only be completed after its start time");
    }

    appointment.status = status;
    if (status === "cancelled") appointment.cancelledBy = req.user.role;
    await appointment.save();
    res.json({ success: true, message: `Appointment ${status}`, appointment });
});

module.exports = {
    createAppointment,
    getMyAppointments,
    getDoctorAppointments,
    getAppointmentById,
    cancelAppointment,
    updateAppointmentStatus
};
