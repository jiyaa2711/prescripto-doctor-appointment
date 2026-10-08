// Seeds the database with demo doctors (+ their login accounts) and one admin account.
//   npm run seed                          -> adds what is missing, never deletes anything
//   npm run seed -- --reset               -> DELETES all users, doctors and appointments first
//   npm run seed -- --demo-appointments   -> also adds demo patients + sample appointments
//                                            (past 14 days and next 7 days) for the dashboard
require("dotenv").config({ quiet: true, path: require("path").join(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const Appointment = require("../models/Appointment");
const { doctors, demoPatients } = require("./seedData");
const { generateSlots, todayString, weekdayOf } = require("../utils/slots");

// Small deterministic random generator so the demo data is the same on every run
const makeRandom = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const seedDemoAppointments = async (patientPassword) => {
  if (await Appointment.exists({})) {
    console.log("Appointments already exist - skipping demo appointments");
    return;
  }
  const patients = [];
  for (const p of demoPatients) {
    patients.push(await User.findOne({ email: p.email })
      || await User.create({ ...p, password: patientPassword, role: "patient" }));
  }

  const allDoctors = await Doctor.find({ isActive: true });
  const random = makeRandom(42);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const taken = new Set(); // "doctorId|date|time" (respect the double-booking rule)
  const docs = [];

  for (let offset = -13; offset <= 7; offset++) {
    const date = todayString(offset);
    const count = offset <= 0 ? 1 + Math.floor(random() * 4) : Math.floor(random() * 3);
    for (let i = 0; i < count; i++) {
      const doctor = pick(allDoctors);
      if (!doctor.workingDays.includes(weekdayOf(date))) continue;
      const time = pick(generateSlots(doctor.startTime, doctor.endTime));
      const key = `${doctor._id}|${date}|${time}`;
      if (taken.has(key)) continue;
      taken.add(key);

      const patient = pick(patients);
      const r = random();
      // past -> mostly completed; future -> booked/confirmed, some cancelled
      const status = offset < 0
        ? (r < 0.8 ? "completed" : "cancelled")
        : (r < 0.15 ? "cancelled" : r < 0.6 ? "booked" : "confirmed");
      // booked 0-3 days before the appointment (never in the future)
      const createdAt = new Date(`${todayString(Math.min(0, offset - Math.floor(random() * 4)))}T09:00:00`);

      docs.push({
        user: patient._id, doctor: doctor._id, name: patient.name, email: patient.email, phone: patient.phone,
        date, time, reason: "", fees: doctor.fees, status,
        cancelledBy: status === "cancelled" ? "patient" : null,
        isCancelled: status === "cancelled",
        createdAt, updatedAt: createdAt, __v: 0
      });
    }
  }
  // Raw insert so we can set past createdAt dates (Mongoose would overwrite them)
  await Appointment.collection.insertMany(docs);
  console.log(`${patients.length} demo patients and ${docs.length} demo appointments created`);
};

const ASSETS_DIR = path.join(__dirname, "..", "..", "src", "assets");
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "doctors");

const requireEnv = (name) => {
  if (!process.env[name] || process.env[name].length < 8) {
    console.error(`Please set ${name} (min 8 characters) in backend/.env before seeding`);
    process.exit(1);
  }
  return process.env[name];
};

const run = async () => {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (!adminEmail) {
    console.error("Please set ADMIN_EMAIL in backend/.env before seeding");
    process.exit(1);
  }
  const adminPassword = requireEnv("ADMIN_PASSWORD");
  const doctorPassword = requireEnv("SEED_DOCTOR_PASSWORD");

  await connectDB();
  await Promise.all([User.syncIndexes(), Doctor.syncIndexes(), Appointment.syncIndexes()]);

  if (process.argv.includes("--reset")) {
    await Promise.all([Appointment.deleteMany({}), Doctor.deleteMany({}), User.deleteMany({})]);
    console.log("Existing users, doctors and appointments deleted");
  }

  // Admin account
  if (!(await User.exists({ email: adminEmail }))) {
    await User.create({ name: "Admin", email: adminEmail, password: adminPassword, role: "admin" });
    console.log(`Admin created: ${adminEmail}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  // Doctors
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  let created = 0;
  for (const { image, ...data } of doctors) {
    if (await Doctor.exists({ email: data.email })) continue;

    const source = path.join(ASSETS_DIR, image);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(UPLOAD_DIR, image));

    const account = await User.findOne({ email: data.email })
      || await User.create({ name: data.name, email: data.email, password: doctorPassword, role: "doctor" });

    await Doctor.create({ ...data, photo: `/uploads/doctors/${image}`, user: account._id });
    created++;
  }
  console.log(`${created} doctor(s) created (${doctors.length - created} already existed)`);

  if (process.argv.includes("--demo-appointments")) {
    await seedDemoAppointments(requireEnv("SEED_PATIENT_PASSWORD"));
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("Seeding failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
