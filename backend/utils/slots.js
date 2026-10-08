// Helpers for working out a doctor's bookable time slots.
const { SLOT_MINUTES } = require("../constants/appointment");

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// All slots between the doctor's start and end time, e.g. ["10:00", "10:30", ...]
const generateSlots = (startTime, endTime) => {
  const slots = [];
  for (let t = toMinutes(startTime); t + SLOT_MINUTES <= toMinutes(endTime); t += SLOT_MINUTES) {
    slots.push(toHHMM(t));
  }
  return slots;
};

// "YYYY-MM-DD" -> weekday number (0 = Sunday ... 6 = Saturday)
const weekdayOf = (dateString) => {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

// Local date as "YYYY-MM-DD" (used for "today" comparisons).
// todayString(7) gives the date one week from today.
const todayString = (addDays = 0) => {
  const now = new Date();
  now.setDate(now.getDate() + addDays);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

module.exports = { generateSlots, weekdayOf, todayString, toMinutes };
