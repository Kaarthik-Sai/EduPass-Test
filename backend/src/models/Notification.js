const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionRequest' },
    isRead: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
