const mongoose = require('mongoose');
const documentSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionRequest', required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: { type: String, required: true, maxlength: 255 },
  storageKey: { type: String, unique: true, sparse: true, required: function () { return !['mongo'].includes(this.storage); } },
  mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png'], required: true },
  size: { type: Number, required: true, min: 1 },
  storage: { type: String, enum: ['local', 'mongo', 'gridfs'], default: 'local' },
  uploadedAt: { type: Date, default: Date.now },
  // Read-only compatibility for records created by the earlier beta upload implementation.
  data: { type: Buffer, select: false },
}, { timestamps: true });
module.exports = mongoose.model('PermissionDocument', documentSchema);

