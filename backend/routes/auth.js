const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../midle/authMiddleware");

// Slows down password guessing: max 10 FAILED attempts per IP every 15 minutes
// (successful logins/registrations are not counted)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many failed attempts. Please try again in 15 minutes." }
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);

module.exports = router;
