const multer = require("multer");

// 404 for unknown API routes
const notFound = (req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
};

// Central error handler: turns every error into a clean JSON response.
// Stack traces and internal messages are only logged on the server, never sent to the client.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.isOperational ? err.message : "Something went wrong. Please try again later.";

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map((e) => e.message).join(", ");
    } else if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid value for ${err.path}`;
    } else if (err.code === 11000) {
        statusCode = 409;
        message = err.keyPattern && err.keyPattern.time
            ? "This time slot has just been booked. Please choose another slot."
            : "A record with this value already exists";
    } else if (err instanceof multer.MulterError) {
        statusCode = 400;
        message = err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 2 MB" : "Invalid file upload";
    } else if (err.type === "entity.parse.failed") {
        statusCode = 400;
        message = "Invalid JSON in request body";
    } else if (err.type === "entity.too.large") {
        statusCode = 413;
        message = "Request body is too large";
    }

    if (statusCode >= 500) console.error(err);

    res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };
