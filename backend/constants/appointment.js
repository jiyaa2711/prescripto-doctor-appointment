// Appointment rules shared by the model and the controllers.
const APPOINTMENT_STATUSES = ["booked", "confirmed", "completed", "cancelled"];

// Statuses a booking can move to from its current status.
// e.g. a "completed" appointment can no longer be cancelled.
const ALLOWED_TRANSITIONS = {
  booked: ["confirmed", "cancelled", "completed"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const SLOT_MINUTES = 30; // length of one appointment slot
const MAX_DAYS_AHEAD = 60; // how far into the future patients can book

module.exports = { APPOINTMENT_STATUSES, ALLOWED_TRANSITIONS, SLOT_MINUTES, MAX_DAYS_AHEAD };
