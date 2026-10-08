const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { isNonEmptyString, isValidDateString } = require("../utils/validators");

// Address can arrive as an object (JSON body) or as a JSON string (multipart form with an image)
const parseAddress = (address) => {
    if (typeof address === "string") {
        try { address = JSON.parse(address); } catch { return undefined; }
    }
    if (!address || typeof address !== "object") return undefined;
    return {
        line1: String(address.line1 || "").slice(0, 200),
        line2: String(address.line2 || "").slice(0, 200)
    };
};

// GET /api/users/profile
const getProfile = asyncHandler(async (req, res) => {
    res.json({ success: true, user: req.user });
});

// PUT /api/users/profile  (JSON or multipart/form-data with an "image" file)
// Only these fields can be changed here - email, role and isActive are NOT editable by the user.
const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, gender, dob, address } = req.body;
    const user = req.user;

    if (name !== undefined) {
        if (!isNonEmptyString(name, 100)) throw new AppError("Name cannot be empty");
        user.name = name.trim();
    }
    if (phone !== undefined) {
        if (typeof phone !== "string" || !/^[0-9+\-\s]{0,20}$/.test(phone)) throw new AppError("Invalid phone number");
        user.phone = phone.trim();
    }
    if (gender !== undefined) user.gender = gender; // enum checked by the model
    if (dob !== undefined) {
        if (dob !== "" && !isValidDateString(dob)) throw new AppError("Invalid date of birth");
        user.dob = dob;
    }
    const parsedAddress = parseAddress(address);
    if (parsedAddress) user.address = parsedAddress;
    if (req.file) user.image = `/uploads/users/${req.file.filename}`;

    await user.save();
    res.json({ success: true, message: "Profile updated", user });
});

module.exports = { getProfile, updateProfile, parseAddress };
