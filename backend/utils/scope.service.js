const mongoose = require('mongoose');
const { FacultySectionMapping, Section, HodProfile } = require('../models');
const { ROLES } = require('../config/constants');

// Sections a faculty member may access.
exports.facultySectionIds = async (facultyId) => {
  const rows = await FacultySectionMapping.find({ faculty: facultyId, isActive: true }).select('section');
  return rows.map((r) => r.section);
};

// Department a HOD controls (from their HOD profile, not the client).
exports.hodDepartmentId = async (userId) => {
  const p = await HodProfile.findOne({ user: userId }).select('department');
  return p && p.department;
};

// Mongo filter limiting PermissionRequest queries to what this user may see.
// Every list/detail/report endpoint must merge this into its query.
exports.requestScope = async (user) => {
  switch (user.role) {
    case ROLES.STUDENT: return { student: user._id };
    case ROLES.FACULTY: return { section: { $in: await exports.facultySectionIds(user._id) } };
    case ROLES.HOD: {
      const dep = await exports.hodDepartmentId(user._id);
      return { department: dep || new mongoose.Types.ObjectId() }; // no dept => matches nothing
    }
    case ROLES.ADMIN: return {};
    default: return { _id: new mongoose.Types.ObjectId() };
  }
};

exports.sectionBelongsToDept = async (sectionId, deptId) =>
  !!(await Section.exists({ _id: sectionId, department: deptId }));
