const mongoose = require("mongoose");
const { APPOINTMENT_STATUSES } = require("../constants/appointment");

const appointmentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    // Patient contact details at the time of booking
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm (24h)
    reason: { type: String, trim: true, maxlength: 500, default: "" },
    fees: { type: Number, default: 0 }, // doctor's fee when the booking was made
    status: { type: String, enum: APPOINTMENT_STATUSES, default: "booked" },
    cancelledBy: { type: String, enum: ["patient", "doctor", "admin", null], default: null },
    // Kept in sync with status by the hook below; used by the double-booking index
    isCancelled: { type: Boolean, default: false }
}, { timestamps: true });

appointmentSchema.pre("save", function(next) {
    this.isCancelled = this.status === "cancelled";
    next();
});

// Prevents double booking at the DATABASE level: a doctor can have only one
// non-cancelled appointment per date + time. Works even if two patients click
// "Book" at the same moment. Cancelled appointments free the slot again.
appointmentSchema.index(
    { doctor: 1, date: 1, time: 1 },
    { unique: true, partialFilterExpression: { isCancelled: false } }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
