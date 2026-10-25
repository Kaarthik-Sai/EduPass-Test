const mongoose = require('mongoose');

const passSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionRequest', required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Only the hash is stored; the raw token lives in the QR payload.
    tokenHash: { type: String, required: true, unique: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedReason: String,
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PermissionPass', passSchema);
