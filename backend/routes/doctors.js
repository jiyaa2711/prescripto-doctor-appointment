const express = require("express");
const router = express.Router();
const doctor = require("../controllers/doctorController");
const { protect, authorize } = require("../midle/authMiddleware");
const validateObjectId = require("../midle/validateObjectId");
const { doctorImageUpload } = require("../midle/upload");

// Public
router.get("/", doctor.getDoctors);
router.get("/specialties", doctor.getSpecialties);

// Logged-in doctor (must come before "/:id" so "me" isn't treated as an id)
router.get("/me/profile", protect, authorize("doctor"), doctor.getMyDoctorProfile);
router.put("/me/profile", protect, authorize("doctor"), doctor.updateMyDoctorProfile);

// Public
router.get("/:id", validateObjectId(), doctor.getDoctorById);
router.get("/:id/slots", validateObjectId(), doctor.getDoctorSlots);

// Admin
router.post("/", protect, authorize("admin"), doctorImageUpload, doctor.createDoctor);
router.put("/:id", protect, authorize("admin"), validateObjectId(), doctorImageUpload, doctor.updateDoctor);
router.patch("/:id/status", protect, authorize("admin"), validateObjectId(), doctor.setDoctorStatus);
router.delete("/:id", protect, authorize("admin"), validateObjectId(), doctor.deleteDoctor);

module.exports = router;
