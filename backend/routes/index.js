const router = require('express').Router();
const { protect } = require('../middleware/auth');

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
router.use('/auth', require('./auth.routes'));
router.use('/permissions', require('./permission.routes'));
router.use('/categories', require('./category.routes'));
router.use('/dashboard', protect, require('./dashboard.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
