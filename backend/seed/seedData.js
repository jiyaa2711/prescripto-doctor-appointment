// Demo doctors based on the 15 mock doctors in src/assets/assets.js.
// Specialties were redistributed so every supported specialty (incl. the new
// Cardiologist and Orthopedic) has at least one doctor.
// "image" is the file name inside src/assets - the seed script copies it to backend/uploads/doctors.

const ADDRESS = (n) => ({ line1: `${n}th Cross, Richmond`, line2: "Circle, Ring Road, London" });

const ABOUT = {
  "General Physician": "Provides comprehensive primary care with a focus on preventive medicine, routine check-ups and the first evaluation of common health concerns.",
  "Gynecologist": "Specialises in women's reproductive health, including routine examinations, pregnancy care and menstrual concerns.",
  "Dermatologist": "Treats conditions of the skin, hair and nails, such as acne, rashes, eczema and allergies.",
  "Pediatrician": "Cares for infants, children and adolescents, from routine check-ups and vaccinations to common childhood illnesses.",
  "Neurologist": "Focuses on disorders of the brain and nervous system, such as headaches, migraines, dizziness and nerve problems.",
  "Gastroenterologist": "Specialises in the digestive system, including stomach pain, acidity, liver and bowel concerns.",
  "Cardiologist": "Focuses on heart and blood-vessel health, including blood pressure, palpitations and heart check-ups.",
  "Orthopedic": "Treats bones, joints, muscles and ligaments, including knee and back pain, fractures and sports injuries."
};

const doctors = [
  { image: "doc1.png", name: "Dr. Richard James", specialty: "General Physician", gender: "Male", experience: 4, fees: 50, address: ADDRESS(17), languages: ["English", "Hindi"] },
  { image: "doc2.png", name: "Dr. Emily Larson", specialty: "Gynecologist", gender: "Female", experience: 3, fees: 60, address: ADDRESS(27), languages: ["English"] },
  { image: "doc3.png", name: "Dr. Sarah Patel", specialty: "Dermatologist", gender: "Female", experience: 1, fees: 30, address: ADDRESS(37), languages: ["English", "Gujarati", "Hindi"] },
  { image: "doc4.png", name: "Dr. Christopher Lee", specialty: "Pediatrician", gender: "Male", experience: 2, fees: 40, address: ADDRESS(47), languages: ["English"] },
  { image: "doc5.png", name: "Dr. Jennifer Garcia", specialty: "Neurologist", gender: "Female", experience: 4, fees: 50, address: ADDRESS(57), languages: ["English", "Spanish"] },
  { image: "doc6.png", name: "Dr. Andrew Williams", specialty: "Cardiologist", gender: "Male", experience: 8, fees: 80, address: ADDRESS(57), languages: ["English"] },
  { image: "doc7.png", name: "Dr. Christopher Davis", specialty: "General Physician", gender: "Male", experience: 4, fees: 50, address: ADDRESS(17), languages: ["English"] },
  { image: "doc8.png", name: "Dr. Timothy White", specialty: "Gynecologist", gender: "Male", experience: 3, fees: 60, address: ADDRESS(27), languages: ["English"] },
  { image: "doc9.png", name: "Dr. Ava Mitchell", specialty: "Dermatologist", gender: "Female", experience: 1, fees: 30, address: ADDRESS(37), languages: ["English"] },
  { image: "doc10.png", name: "Dr. Jeffrey King", specialty: "Pediatrician", gender: "Male", experience: 2, fees: 40, address: ADDRESS(47), languages: ["English", "Hindi"] },
  { image: "doc11.png", name: "Dr. Zoe Kelly", specialty: "Gastroenterologist", gender: "Female", experience: 5, fees: 55, address: ADDRESS(57), languages: ["English"] },
  { image: "doc12.png", name: "Dr. Patrick Harris", specialty: "Orthopedic", gender: "Male", experience: 6, fees: 70, address: ADDRESS(57), languages: ["English"] },
  { image: "doc13.png", name: "Dr. Chloe Evans", specialty: "General Physician", gender: "Female", experience: 4, fees: 50, address: ADDRESS(17), languages: ["English", "French"] },
  { image: "doc14.png", name: "Dr. Ryan Martinez", specialty: "Cardiologist", gender: "Male", experience: 10, fees: 90, address: ADDRESS(27), languages: ["English", "Spanish"] },
  { image: "doc15.png", name: "Dr. Amelia Hill", specialty: "Orthopedic", gender: "Female", experience: 5, fees: 65, address: ADDRESS(37), languages: ["English"] }
].map((d) => ({
  ...d,
  degree: "MBBS",
  about: ABOUT[d.specialty],
  // e.g. "Dr. Richard James" -> richard.james@prescripto.test (demo login for the doctor dashboard)
  email: d.name.replace("Dr. ", "").toLowerCase().replace(/\s+/g, ".") + "@prescripto.test"
}));

// Demo patients for "npm run seed -- --demo-appointments"
const demoPatients = [
  { name: "Aarav Shah", email: "aarav.shah@patient.test", phone: "9000000001", gender: "Male" },
  { name: "Priya Mehta", email: "priya.mehta@patient.test", phone: "9000000002", gender: "Female" },
  { name: "John Carter", email: "john.carter@patient.test", phone: "9000000003", gender: "Male" },
  { name: "Fatima Khan", email: "fatima.khan@patient.test", phone: "9000000004", gender: "Female" },
  { name: "Liam Brown", email: "liam.brown@patient.test", phone: "9000000005", gender: "Male" }
];

module.exports = { doctors, demoPatients };
