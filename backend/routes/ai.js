const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");
const { doctorFinder } = require("../controllers/aiController");

// AI calls cost money and time: limit each IP address to 10 requests per minute
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.AI_RATE_LIMIT_PER_MINUTE) || 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please wait a minute and try again." }
});

// Public: patients can use the finder before logging in
router.post("/doctor-finder", aiLimiter, doctorFinder);

module.exports = { router, aiLimiter };
