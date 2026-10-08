const express = require("express");
const router = express.Router();
const appointment = require("../controllers/appointmentController");
const { protect, authorize } = require("../midle/authMiddleware");
const validateObjectId = require("../midle/validateObjectId");

// Every appointment route requires login
router.use(protect);

// Patient
router.post("/", authorize("patient"), appointment.createAppointment);
router.get("/", authorize("patient"), appointment.getMyAppointments);

// Doctor
router.get("/doctor", authorize("doctor"), appointment.getDoctorAppointments);

// Patient / doctor / admin - ownership is checked inside the controller
router.get("/:id", validateObjectId(), appointment.getAppointmentById);
router.patch("/:id/cancel", validateObjectId(), appointment.cancelAppointment);
router.patch("/:id/status", authorize("doctor", "admin"), validateObjectId(), appointment.updateAppointmentStatus);

module.exports = router;
