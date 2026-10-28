const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { PermissionCategory, AppSettings } = require('../models');
router.get('/', protect, async (req, res, next) => {
  try {
    const [categories, settings] = await Promise.all([
      PermissionCategory.find({ isActive: true }).sort({ name: 1 }).select('name slug description requiresHod requiresDocument maxDurationHours'),
      AppSettings.get(),
    ]);
    const uploadLimitMB = Math.min(process.env.VERCEL ? 4 : 25, Math.max(1, Number(settings.maxFileSizeMB) || 5));
    res.json({ success: true, categories, uploadLimitMB });
  } catch (error) { next(error); }
});
module.exports = router;
