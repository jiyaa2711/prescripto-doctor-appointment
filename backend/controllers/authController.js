const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { isNonEmptyString, isValidEmail } = require("../utils/validators");

const MIN_PASSWORD_LENGTH = 8;

// The token only stores the user id. The role is looked up from the DB on every request.
const signToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// The small, safe user object the frontend needs (never the password hash)
const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image
});

// POST /api/auth/register  -> always creates a "patient" account
const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!isNonEmptyString(name, 100)) throw new AppError("Please enter your name");
    if (!isValidEmail(email)) throw new AppError("Please enter a valid email");
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH || password.length > 100) {
        throw new AppError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const userExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (userExists) throw new AppError("An account with this email already exists", 409);

    // "role" is deliberately NOT read from req.body
    const user = await User.create({ name: name.trim(), email, password, role: "patient" });

    res.status(201).json({ success: true, token: signToken(user._id), user: publicUser(user) });
});

// POST /api/auth/login  -> same endpoint for patients, doctors and admins
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!isValidEmail(email) || typeof password !== "string" || !password) {
        throw new AppError("Please enter your email and password");
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    // Same message for "no such user" and "wrong password" so attackers can't discover emails
    if (!user || !(await user.matchPassword(password))) {
        throw new AppError("Invalid email or password", 401);
    }
    if (!user.isActive) throw new AppError("Your account has been deactivated. Please contact support.", 403);

    res.json({ success: true, token: signToken(user._id), user: publicUser(user) });
});

// GET /api/auth/me  -> who is logged in (used by the frontend on page load)
const getMe = asyncHandler(async (req, res) => {
    const result = { success: true, user: publicUser(req.user) };
    if (req.user.role === "doctor") {
        const doctor = await Doctor.findOne({ user: req.user._id }).select("_id name specialty");
        result.doctorProfile = doctor;
    }
    res.json(result);
});

module.exports = { register, login, getMe, MIN_PASSWORD_LENGTH };
