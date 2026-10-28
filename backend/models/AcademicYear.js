const mongoose = require('mongoose');

// Configurable by admin; defaults seeded as 1st-4th year.
const academicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "1st Year"
    level: { type: Number, required: true, unique: true, min: 1 },     // 1..n, used for ordering
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AcademicYear', academicYearSchema);
