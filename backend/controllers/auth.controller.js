const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken, sha256, randomToken } = require('../utils/token');
const { User, StudentProfile, FacultyProfile, HodProfile } = require('../models');
const { logAudit } = require('../utils/audit.service');
const { sendEmail } = require('../utils/email.service');
const { ROLES } = require('../config/constants');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const loadProfile = async (user) => {
  const populate = [{ path: 'department', select: 'name code' }];
  if (user.role === ROLES.STUDENT)
    return StudentProfile.findOne({ user: user._id })
      .populate('department', 'name code').populate('academicYear', 'name level').populate('section', 'name');
  if (user.role === ROLES.FACULTY) return FacultyProfile.findOne({ user: user._id }).populate(populate);
  if (user.role === ROLES.HOD) return HodProfile.findOne({ user: user._id }).populate(populate);
  return null;
};

const dashboardPath = { student: '/student', faculty: '/faculty', hod: '/hod', admin: '/admin' };

exports.login = asyncHandler(async (req, res) => {
  const { loginId, password } = req.body;
  const user = await User.findOne({ loginId: String(loginId).toUpperCase() }).select('+password');
  const generic = new ApiError(401, 'Invalid college ID or password');

  if (!user) throw generic;
  if (user.lockUntil && user.lockUntil > new Date())
    throw new ApiError(423, 'Account temporarily locked due to repeated failed logins. Try again later');
  if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated. Contact the administrator');

  if (!(await user.matchPassword(password))) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
      user.failedLoginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    await logAudit(req, 'auth.login_failed', { entity: 'User', entityId: user._id, actor: user });
    throw generic;
  }

  user.failedLoginAttempts = 0; user.lockUntil = undefined; user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  await logAudit(req, 'auth.login', { entity: 'User', entityId: user._id, actor: user });

  res.json({
    success: true,
    token: signToken(user),
    user: user.toSafeJSON(),
    profile: await loadProfile(user),
    redirectTo: dashboardPath[user.role],
  });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({
    success: true, user: req.user.toSafeJSON(), profile: await loadProfile(req.user),
    redirectTo: dashboardPath[req.user.role],
  });
});

exports.logout = asyncHandler(async (req, res) => {
  // JWTs are stateless; client discards the token. We record the event for the audit trail.
  await logAudit(req, 'auth.logout', { entity: 'User', entityId: req.user._id });
  res.json({ success: true, message: 'Logged out' });
});

// Always responds identically so emails can't be enumerated.
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email, isActive: true });
  if (user) {
    const raw = randomToken();
    user.resetTokenHash = sha256(raw);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60000);
    await user.save({ validateBeforeSave: false });
    const frontendOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');
    const link = `${frontendOrigin}/reset-password?token=${raw}`;
    await sendEmail({ to: user.email, subject: 'EduPass password reset', text: `Reset your password (valid 30 min): ${link}` });
    await logAudit(req, 'auth.password_reset_requested', { entity: 'User', entityId: user._id, actor: user });
  }
  res.json({ success: true, message: 'If that email is registered, a reset link has been sent' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetTokenHash: sha256(req.body.token),
    resetTokenExpires: { $gt: new Date() },
  }).select('+resetTokenHash +resetTokenExpires +password');
  if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');

  user.password = req.body.password;
  user.resetTokenHash = undefined; user.resetTokenExpires = undefined;
  user.mustChangePassword = false; user.failedLoginAttempts = 0; user.lockUntil = undefined;
  await user.save();
  await logAudit(req, 'auth.password_reset', { entity: 'User', entityId: user._id, actor: user });
  res.json({ success: true, message: 'Password updated. You can now log in' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect');
  user.password = req.body.password;
  user.mustChangePassword = false;
  await user.save();
  await logAudit(req, 'auth.password_changed', { entity: 'User', entityId: user._id });
  res.json({ success: true, message: 'Password changed', token: signToken(user) });
});

// Users may only edit these fields on themselves; academic placement is admin-controlled.
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  if (req.user.role === ROLES.STUDENT && (req.body.guardianName !== undefined || req.body.guardianPhone !== undefined || req.body.address !== undefined)) {
    const upd = {};
    ['guardianName', 'guardianPhone', 'address'].forEach((k) => { if (req.body[k] !== undefined) upd[k] = req.body[k]; });
    await StudentProfile.updateOne({ user: req.user._id }, { $set: upd });
  }
  res.json({ success: true, user: req.user.toSafeJSON(), profile: await loadProfile(req.user) });
});
