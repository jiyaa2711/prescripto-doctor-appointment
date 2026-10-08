// Single source of truth for the medical specialties supported by the app.
// The Doctor model, the seed script and the AI Doctor Finder all use this list,
// so the AI can never return a specialty that the app doesn't support.
const SPECIALTIES = [
  "General Physician",
  "Gynecologist",
  "Dermatologist",
  "Pediatrician",
  "Neurologist",
  "Gastroenterologist",
  "Cardiologist",
  "Orthopedic",
];

module.exports = { SPECIALTIES };
