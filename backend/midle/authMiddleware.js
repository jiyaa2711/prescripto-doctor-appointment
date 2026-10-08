const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

// protect: allows the request only if it carries a valid JWT ("Authorization: Bearer <token>").
// The user (and their ROLE) is always loaded fresh from the database, so a role
// sent by the frontend - or an old token of a deactivated user - is never trusted.
const protect = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError("Not authorized, please log in", 401);

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        throw new AppError("Session expired or invalid, please log in again", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) throw new AppError("Account no longer exists", 401);
    if (!user.isActive) throw new AppError("Your account has been deactivated", 403);

    req.user = user;
    next();
});

// authorize("admin") or authorize("doctor", "admin"): role-based access. Use after protect.
const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
};

module.exports = { protect, authorize };
