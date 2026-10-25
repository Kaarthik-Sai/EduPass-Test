const mongoose = require('mongoose');

const facultyProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    designation: { type: String, trim: true },
    canVerifyPasses: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FacultyProfile', facultyProfileSchema);
