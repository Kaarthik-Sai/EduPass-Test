const router = require('express').Router();
const { User, PermissionRequest, PermissionCategory, Notification } = require('../models');
const { requestScope } = require('../utils/scope.service');
router.get('/', async (req, res, next) => {
  try {
    const scope = await requestScope(req.user);
    const [total, pending, approved, rejected, recent, categories, unread] = await Promise.all([
      PermissionRequest.countDocuments(scope),
      PermissionRequest.countDocuments({ ...scope, status: { $in: ['submitted', 'pending_faculty', 'faculty_approved', 'pending_hod'] } }),
      PermissionRequest.countDocuments({ ...scope, status: { $in: ['approved', 'pass_generated', 'active', 'completed', 'expired'] } }),
      PermissionRequest.countDocuments({ ...scope, status: 'rejected' }),
      PermissionRequest.find(scope).sort({ createdAt: -1 }).limit(5).populate('student', 'name loginId').populate('category', 'name requiresDocument').populate('documents', 'originalName size'),
      PermissionCategory.countDocuments({ isActive: true }),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
    ]);
    res.json({ success: true, stats: { total, pending, approved, rejected, categories, unread }, recent });
  } catch (error) { next(error); }
});
module.exports = router;

