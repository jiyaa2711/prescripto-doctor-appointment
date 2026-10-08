const AppError = require("../utils/AppError");
const { isValidObjectId } = require("../utils/validators");

// Rejects requests like GET /api/doctors/abc before they reach the database.
const validateObjectId = (paramName = "id") => (req, res, next) => {
    if (!isValidObjectId(req.params[paramName])) {
        return next(new AppError(`Invalid ${paramName}`, 400));
    }
    next();
};

module.exports = validateObjectId;
