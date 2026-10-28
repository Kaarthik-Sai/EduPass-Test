const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { User, Department, AcademicYear, Section, StudentProfile, FacultyProfile, HodProfile, FacultySectionMapping } = require('../models');

exports.lookups = asyncHandler(async (req, res) => {
  const [departments, academicYears, sections] = await Promise.all([
    Department.find({ isActive: true }).select('name code').sort('name'),
    AcademicYear.find({ isActive: true }).select('name level').sort('level'),
    Section.find({ isActive: true }).select('name department academicYear').sort('name'),
  ]);
  res.json({ success: true, departments, academicYears, sections });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const filter = {};
  if (['student', 'faculty', 'hod', 'admin'].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.q) {
    const q = String(req.query.q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: q, $options: 'i' } }, { loginId: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select('name email loginId role department isActive lastLoginAt createdAt').populate('department', 'name code').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, loginId, password, role, department, academicYear, section, sections = [] } = req.body;
  if (!name || !email || !loginId || !password || !role) throw new ApiError(422, 'Name, email, college ID, password, and role are required');
  if (!['student', 'faculty', 'hod', 'admin'].includes(role)) throw new ApiError(422, 'Choose a valid role');
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) throw new ApiError(422, 'Password must be at least 8 characters with uppercase, lowercase, and a number');
  const placementRequired = ['student', 'faculty', 'hod'].includes(role);
  if (placementRequired && !mongoose.isValidObjectId(department)) throw new ApiError(422, 'Select a department');
  let dept;
  if (placementRequired) {
    dept = await Department.findOne({ _id: department, isActive: true });
    if (!dept) throw new ApiError(422, 'Department not found');
  }
  let year; let assignedSection;
  if (role === 'student') {
    if (!mongoose.isValidObjectId(academicYear) || !mongoose.isValidObjectId(section)) throw new ApiError(422, 'Select academic year and section');
    year = await AcademicYear.findOne({ _id: academicYear, isActive: true });
    assignedSection = await Section.findOne({ _id: section, department, academicYear, isActive: true });
    if (!year || !assignedSection) throw new ApiError(422, 'Section must belong to the selected department and academic year');
  }
  if (role === 'faculty' && !Array.isArray(sections)) throw new ApiError(422, 'Sections must be an array');
  if (role === 'faculty' && sections.length === 0) throw new ApiError(422, 'Assign at least one section to faculty');
  let assignedSections = [];
  if (role === 'faculty' && sections.length) {
    if (!Array.isArray(sections) || sections.some((id) => !mongoose.isValidObjectId(id))) throw new ApiError(422, 'Invalid section assignment');
    assignedSections = await Section.find({ _id: { $in: sections }, department, isActive: true }).select('_id');
    if (new Set(sections.map(String)).size !== assignedSections.length) throw new ApiError(422, 'Faculty sections must be active sections in the selected department');
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedId = String(loginId).trim().toUpperCase();
  if (await User.exists({ $or: [{ email: normalizedEmail }, { loginId: normalizedId }] })) throw new ApiError(409, 'Email or college ID already exists');

  let user;
  try {
    user = await User.create({ name: String(name).trim(), email: normalizedEmail, loginId: normalizedId, password, role, department: dept?._id });
    if (role === 'student') await StudentProfile.create({ user: user._id, department: dept._id, academicYear: year._id, section: assignedSection._id });
    if (role === 'faculty') {
      await FacultyProfile.create({ user: user._id, department: dept._id });
      if (assignedSections.length) await FacultySectionMapping.insertMany(assignedSections.map((item) => ({ faculty: user._id, section: item._id })));
    }
    if (role === 'hod') {
      await HodProfile.create({ user: user._id, department: dept._id });
      await Department.updateOne({ _id: dept._id }, { hod: user._id });
    }
  } catch (error) {
    if (user) {
      await Promise.all([StudentProfile.deleteMany({ user: user._id }), FacultyProfile.deleteMany({ user: user._id }), HodProfile.deleteMany({ user: user._id }), FacultySectionMapping.deleteMany({ faculty: user._id }), User.deleteOne({ _id: user._id })]);
    }
    if (error.code === 11000) throw new ApiError(409, 'Email, college ID, HOD assignment, or section mapping already exists');
    throw error;
  }
  res.status(201).json({ success: true, message: 'Account created', user: user.toSafeJSON() });
});

exports.setActive = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid user ID');
  if (String(req.user._id) === String(new mongoose.Types.ObjectId(req.params.id))) throw new ApiError(400, 'You cannot deactivate your own account');
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(422, 'isActive must be true or false');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (!req.body.isActive && user.role === 'admin' && await User.countDocuments({ role: 'admin', isActive: true }) <= 1) throw new ApiError(409, 'At least one active admin account must remain');
  user.isActive = req.body.isActive; await user.save();
  res.json({ success: true, user: user.toSafeJSON() });
});


