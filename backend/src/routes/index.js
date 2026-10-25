const router = require('express').Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
router.use('/auth', require('./auth.routes'));
// Phase 2+: /requests, /approvals, /passes, /outside, /notifications, /reports, /admin/*, ...

module.exports = router;
