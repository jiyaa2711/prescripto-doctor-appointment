// Small, dependency-free validation helpers used by the controllers.
const mongoose = require("mongoose");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm (24h)

const isNonEmptyString = (value, max = 200) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

const isValidEmail = (value) => typeof value === "string" && EMAIL_REGEX.test(value.trim());

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value) && String(new mongoose.Types.ObjectId(value)) === String(value);

// Checks the format AND that the date really exists (rejects 2025-02-31).
const isValidDateString = (value) => {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

const isValidTimeString = (value) => typeof value === "string" && TIME_REGEX.test(value);

// Escapes user text before it is used inside a MongoDB $regex search.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Copies only the allowed keys from an object (prevents mass-assignment, e.g. setting "role").
const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

module.exports = {
  isNonEmptyString,
  isValidEmail,
  isValidObjectId,
  isValidDateString,
  isValidTimeString,
  escapeRegex,
  pick,
};
