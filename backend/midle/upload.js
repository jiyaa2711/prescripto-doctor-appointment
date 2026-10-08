const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const AppError = require("../utils/AppError");

// Profile images are stored on disk in backend/uploads/<folder> and served at /uploads/<folder>/...
const makeUploader = (folder) => {
    const dir = path.join(__dirname, "..", "uploads", folder);
    fs.mkdirSync(dir, { recursive: true });

    const ALLOWED = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

    return multer({
        storage: multer.diskStorage({
            destination: dir,
            // Random file name: never use the client's file name (path tricks, overwrites)
            filename: (req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype])
        }),
        limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
        fileFilter: (req, file, cb) => {
            if (ALLOWED[file.mimetype]) return cb(null, true);
            cb(new AppError("Only JPG, PNG or WEBP images are allowed", 400));
        }
    });
};

module.exports = {
    doctorImageUpload: makeUploader("doctors").single("image"),
    userImageUpload: makeUploader("users").single("image")
};
