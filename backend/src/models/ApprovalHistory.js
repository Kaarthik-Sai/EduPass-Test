const mongoose = require('mongoose');

// Append-only log of every status change on a request.
const approvalHistorySchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionRequest', required: true, index: true },
    fromStatus: String,
    toStatus: { type: String, required: true },
    action: { type: String, required: true }, // submit | faculty_approve | faculty_reject | hod_approve | ...
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: String,
    remarks: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model('ApprovalHistory', approvalHistorySchema);
