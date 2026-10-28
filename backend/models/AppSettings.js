const mongoose = require('mongoose');

// Singleton document (key = 'global').
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    collegeName: { type: String, default: 'Your College' },
    maxRequestsPerDay: { type: Number, default: 3 },
    advanceBookingDays: { type: Number, default: 30 },
    allowedFileTypes: { type: [String], default: ['application/pdf', 'image/jpeg', 'image/png'] },
    maxFileSizeMB: { type: Number, default: 5 },
    expiryWarningMinutes: { type: Number, default: 30 },
    notifications: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.get = async function () {
  return this.findOneAndUpdate({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true, new: true });
};

module.exports = mongoose.model('AppSettings', settingsSchema);
