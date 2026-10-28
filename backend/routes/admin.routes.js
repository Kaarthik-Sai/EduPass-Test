const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/admin.controller');
router.use(protect, authorize('admin'));
router.get('/lookups', c.lookups);
router.get('/users', c.listUsers);
router.post('/users', c.createUser);
router.patch('/users/:id/active', c.setActive);
module.exports = router;
