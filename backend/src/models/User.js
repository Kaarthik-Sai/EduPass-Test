const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // college login ID: roll number for students, employee ID for staff
    loginId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    isActive: { type: Boolean, default: true, index: true },
    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: Date,
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    lastLoginAt: Date,
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const o = this.toObject();
  delete o.password; delete o.resetTokenHash; delete o.resetTokenExpires; delete o.__v;
  return o;
};

module.exports = mongoose.model('User', userSchema);
