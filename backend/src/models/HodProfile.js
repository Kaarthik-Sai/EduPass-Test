const mongoose = require('mongoose');

const hodProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, unique: true },
    designation: { type: String, default: 'Head of Department' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HodProfile', hodProfileSchema);
