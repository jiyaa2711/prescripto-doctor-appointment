const express = require("express");
const router = express.Router();
const admin = require("../controllers/adminController");
const { protect, authorize } = require("../midle/authMiddleware");
const validateObjectId = require("../midle/validateObjectId");
const { adminInsights } = require("../controllers/aiController");
const { aiLimiter } = require("./ai");

// Every route in this file: logged in AND role "admin" (checked on the server, not just hidden in the UI)
router.use(protect, authorize("admin"));

router.get("/stats", admin.getDashboardStats);

// Doctor create/update/status/delete live in routes/doctors.js (also admin-only) to avoid duplicate APIs
router.get("/doctors", admin.getAllDoctors);
router.get("/doctors/:id", validateObjectId(), admin.getDoctorForAdmin);

router.get("/users", admin.getUsers);
router.get("/users/:id", validateObjectId(), admin.getUserDetails);
router.patch("/users/:id/status", validateObjectId(), admin.setUserStatus);

router.get("/appointments", admin.getAllAppointments);

// AI summary of aggregated numbers (rate-limited like every AI endpoint)
router.post("/ai-insights", aiLimiter, adminInsights);

module.exports = router;
