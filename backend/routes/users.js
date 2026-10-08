const express = require("express");
const router = express.Router();
const { getProfile, updateProfile } = require("../controllers/userController");
const { protect } = require("../midle/authMiddleware");
const { userImageUpload } = require("../midle/upload");

// Any logged-in user can view/edit their own basic profile
router.get("/profile", protect, getProfile);
router.put("/profile", protect, userImageUpload, updateProfile);

module.exports = router;
