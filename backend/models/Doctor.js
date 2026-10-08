const mongoose = require("mongoose");
const { SPECIALTIES } = require("../constants/specialities");

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const doctorSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Only values from the controlled list are allowed (also used by the AI Doctor Finder)
    specialty: { type: String, required: true, enum: SPECIALTIES },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    photo: { type: String }, // store image URL or path, e.g. /uploads/doctors/doc1.png
    degree: { type: String, trim: true, default: "MBBS" },
    experience: { type: Number, min: 0, max: 70, default: 0 }, // in years
    fees: { type: Number, min: 0, required: true }, // consultation fee
    about: { type: String, trim: true, maxlength: 2000, default: "" },
    gender: { type: String, enum: ["Male", "Female", "Other"], default: "Other" },
    languages: { type: [String], default: ["English"] },
    address: {
        line1: { type: String, default: "" },
        line2: { type: String, default: "" }
    },

    // Availability
    // available = the doctor is currently accepting new bookings (doctor/admin can toggle it)
    available: { type: Boolean, default: true },
    // Weekdays the doctor works: 0 = Sunday ... 6 = Saturday
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
    startTime: { type: String, match: TIME_REGEX, default: "10:00" },
    endTime: { type: String, match: TIME_REGEX, default: "18:00" },

    // isActive = false hides the doctor from patients (admin "deactivate" / soft delete)
    isActive: { type: Boolean, default: true },

    // Login account for this doctor (role "doctor"); lets the doctor see their own appointments
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true }
}, { timestamps: true });

doctorSchema.index({ specialty: 1, isActive: 1 });

module.exports = mongoose.model("Doctor", doctorSchema);
