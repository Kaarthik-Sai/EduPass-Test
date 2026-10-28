const mongoose = require('mongoose');

const mappingSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
mappingSchema.index({ faculty: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('FacultySectionMapping', mappingSchema);
