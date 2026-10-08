const Doctor = require("../models/Doctor");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { AIUnavailableError } = require("../services/aiService");
const {
    recommendSpecialty, detectEmergency, cleanMessage, DISCLAIMER, URGENT_MESSAGE
} = require("../services/doctorFinderService");
const { generateInsights } = require("../services/insightsService");
const { buildAppointmentStats } = require("./adminController");
const { PUBLIC_FIELDS } = require("./doctorController");

const MIN_LENGTH = 3;
const MAX_LENGTH = 500;
const UNAVAILABLE_MESSAGE = "AI assistance is temporarily unavailable. You can browse doctors by specialty.";

// POST /api/ai/doctor-finder   body: { message: "I have acne and skin irritation" }
const doctorFinder = asyncHandler(async (req, res) => {
    // 1. Validate + clean the input
    const message = cleanMessage(req.body.message);
    if (message.length < MIN_LENGTH) throw new AppError("Please describe your health concern in a few words");
    if (message.length > MAX_LENGTH) throw new AppError(`Please keep your description under ${MAX_LENGTH} characters`);

    // 2. Emergency keywords are checked by the server itself (works even if the AI is down)
    const keywordEmergency = detectEmergency(message);

    // 3. The controlled list = supported specialties that currently have active doctors
    const specialties = await Doctor.distinct("specialty", { isActive: true });
    if (specialties.length === 0) throw new AppError("No doctors are available right now", 503);

    // 4. Ask the AI which specialty fits
    let result;
    try {
        result = await recommendSpecialty(message, specialties);
    } catch (err) {
        if (!(err instanceof AIUnavailableError)) throw err;
        console.warn(`[AI doctor-finder] unavailable: ${err.reason}`); // the user's text is NOT logged (privacy)
        return res.json({
            success: true,
            aiAvailable: false,
            message: UNAVAILABLE_MESSAGE,
            needsUrgentCare: keywordEmergency,
            urgentMessage: keywordEmergency ? URGENT_MESSAGE : null,
            disclaimer: DISCLAIMER,
            specialty: null,
            doctors: []
        });
    }

    const needsUrgentCare = keywordEmergency || result.needsUrgentCare;

    if (!result.isHealthRelated) {
        return res.json({
            success: true,
            aiAvailable: true,
            message: "Please describe a health concern or symptom, and we'll suggest the right type of doctor.",
            needsUrgentCare,
            urgentMessage: needsUrgentCare ? URGENT_MESSAGE : null,
            disclaimer: DISCLAIMER,
            specialty: null,
            doctors: []
        });
    }

    // 5. The doctors come from the database - never from the AI
    const doctors = await Doctor.find({ specialty: result.specialty, isActive: true })
        .select(PUBLIC_FIELDS)
        .sort({ available: -1, experience: -1 });

    res.json({
        success: true,
        aiAvailable: true,
        message: `Based on what you've described, a ${result.specialty} may be an appropriate starting point.`,
        specialty: result.specialty,
        confidence: result.confidence,
        reason: result.reason,
        needsUrgentCare,
        urgentMessage: needsUrgentCare ? URGENT_MESSAGE : null,
        disclaimer: DISCLAIMER,
        doctors
    });
});

// POST /api/admin/ai-insights  (admin) - AI summary of aggregated, anonymous numbers
const adminInsights = asyncHandler(async (req, res) => {
    const [appointmentStats, totalDoctors, totalPatients] = await Promise.all([
        buildAppointmentStats(),
        Doctor.countDocuments({ isActive: true }),
        User.countDocuments({ role: "patient" })
    ]);
    const stats = { activeDoctors: totalDoctors, totalPatients, ...appointmentStats };

    try {
        const insights = await generateInsights(stats);
        res.json({ success: true, aiAvailable: true, insights, generatedAt: new Date().toISOString() });
    } catch (err) {
        if (!(err instanceof AIUnavailableError)) throw err;
        console.warn(`[AI insights] unavailable: ${err.reason}`);
        res.json({ success: true, aiAvailable: false, message: "AI insights are temporarily unavailable. The dashboard numbers above are still up to date." });
    }
});

module.exports = { doctorFinder, adminInsights };
