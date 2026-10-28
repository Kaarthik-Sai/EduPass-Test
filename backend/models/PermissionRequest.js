const mongoose = require('mongoose');
const { STATUS } = require('../config/constants');

const decisionSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: { type: String, trim: true, maxlength: 1000 },
  at: Date,
}, { _id: false });

const permissionRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionCategory', required: true, index: true },
  reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  destination: { type: String, required: true, trim: true, maxlength: 200 },
  contactPerson: { type: String, trim: true, maxlength: 120 },
  contactPhone: { type: String, trim: true, maxlength: 30 },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true, index: true },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PermissionDocument' }],
  status: { type: String, enum: Object.values(STATUS), default: STATUS.DRAFT, index: true },
  requiresHod: { type: Boolean, default: false },
  facultyDecision: { type: decisionSchema, default: () => ({}) },
  hodDecision: { type: decisionSchema, default: () => ({}) },
  submittedAt: Date,
  finalApprovedAt: Date,
  pass: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionPass' },
}, { timestamps: true });
permissionRequestSchema.index({ section: 1, status: 1, startAt: -1 });
permissionRequestSchema.index({ department: 1, status: 1, startAt: -1 });
permissionRequestSchema.index({ status: 1, startAt: 1, endAt: 1 });
permissionRequestSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) return next(new Error('End time must be after start time'));
  next();
});
module.exports = mongoose.model('PermissionRequest', permissionRequestSchema);
