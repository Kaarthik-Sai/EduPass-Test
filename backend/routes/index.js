const router = require('express').Router();
const { protect } = require('../middleware/auth');

router.use('/auth', require('./auth.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/categories', require('./category.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/dashboard', protect, require('./dashboard.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
