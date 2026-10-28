const router = require('express').Router();
const multer = require('multer');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ApiError = require('../utils/ApiError');
const { protect, authorize } = require('../middleware/auth');
const { AppSettings } = require('../models');
const c = require('../controllers/permission.controller');
const types = { '.pdf': ['application/pdf'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'] };
const storage = multer.diskStorage({ destination: os.tmpdir(), filename: (req, file, cb) => cb(null, `${randomUUID()}.upload`) });
function uploadDocument(req, res, next) {
  AppSettings.get().then((settings) => {
    req.uploadLimitMB = Math.min(process.env.VERCEL ? 4 : 25, Math.max(1, Number(settings.maxFileSizeMB) || 5));
    const upload = multer({
      storage,
      limits: { fileSize: req.uploadLimitMB * 1024 * 1024, files: 1 },
      fileFilter: (request, file, cb) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        const claimedTypes = types[extension];
        const matches = claimedTypes && (claimedTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream');
        cb(matches ? null : new ApiError(415, 'Choose a PDF, JPG, JPEG, or PNG document'), Boolean(matches));
      },
    }).single('document');
    upload(req, res, next);
  }).catch(next);
}
router.use(protect);
router.get('/', c.list);
router.post('/', authorize('student'), uploadDocument, c.create);
router.get('/pending', authorize('faculty', 'hod', 'admin'), c.pending);
router.get('/documents/:documentId', c.getDocument);
router.post('/verify-pass', authorize('faculty', 'hod', 'admin'), c.verifyPass);
router.get('/:id', c.getOne);
router.post('/:id/review', authorize('faculty'), c.reviewFaculty);
router.post('/:id/review-hod', authorize('hod'), c.reviewHod);
router.post('/:id/cancel', authorize('student'), c.cancel);
module.exports = router;
