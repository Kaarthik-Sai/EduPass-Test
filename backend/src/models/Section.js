const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, uppercase: true }, // "A"
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
sectionSchema.index({ department: 1, academicYear: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
