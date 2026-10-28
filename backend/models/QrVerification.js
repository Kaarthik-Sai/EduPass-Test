const mongoose = require('mongoose');

const qrVerificationSchema = new mongoose.Schema(
  {
    pass: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionPass', index: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionRequest' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    result: { type: String, enum: ['valid', 'invalid', 'expired', 'not_yet_valid', 'revoked', 'not_found'], required: true },
    message: String,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
qrVerificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('QrVerification', qrVerificationSchema);
