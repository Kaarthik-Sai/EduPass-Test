const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    requiresHod: { type: Boolean, default: false },       // approval workflow switch
    requiresDocument: { type: Boolean, default: false },
    maxDurationHours: { type: Number, default: 24 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PermissionCategory', categorySchema);
