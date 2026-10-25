const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionRequest', index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    storage: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    publicId: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('PermissionDocument', documentSchema);
