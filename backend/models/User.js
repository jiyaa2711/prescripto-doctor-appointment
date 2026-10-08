const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["patient", "doctor", "admin"];

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false -> the password hash is never returned by queries unless explicitly asked for
    password: { type: String, required: true, minlength: 6, select: false },
    // Replaces the old isAdmin flag. Registration always creates "patient";
    // "doctor" accounts are created by an admin and "admin" by the seed script.
    role: { type: String, enum: ROLES, default: "patient" },
    isActive: { type: Boolean, default: true },
    phone: { type: String, trim: true, default: "" },
    gender: { type: String, enum: ["Male", "Female", "Other", "Not Selected"], default: "Not Selected" },
    dob: { type: String, default: "" }, // YYYY-MM-DD
    address: {
        line1: { type: String, default: "" },
        line2: { type: String, default: "" }
    },
    image: { type: String, default: "" }
}, { timestamps: true });

// Hash password before save
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Password match
userSchema.methods.matchPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Safety net: never include the password hash when a user is sent as JSON
userSchema.set("toJSON", {
    transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
    }
});

const User = mongoose.model("User", userSchema);
User.ROLES = ROLES;

module.exports = User;
