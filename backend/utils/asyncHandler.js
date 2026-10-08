// Express 4 does not catch errors thrown inside async route handlers.
// Wrapping a handler with asyncHandler forwards any error to the central error handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
