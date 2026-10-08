const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/doctor_booking_db";
  await mongoose.connect(uri);
  console.log("MongoDB connected");
};

module.exports = connectDB;
