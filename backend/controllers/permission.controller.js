const mongoose = require('mongoose');
const QRCode = require('qrcode');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const makeRequestId = require('../utils/requestId');
const { randomToken, sha256 } = require('../utils/token');
const { User, StudentProfile, PermissionCategory, PermissionRequest, PermissionDocument, ApprovalHistory, PermissionPass, QrVerification, AppSettings } = require('../models');
const { requestScope, facultySectionIds, hodDepartmentId } = require('../utils/scope.service');
const { logAudit } = require('../utils/audit.service');
const { notify } = require('../utils/notification.service');
const { STATUS } = require('../config/constants');
const documentStorage = require('../utils/document-storage.service');

const populateRequest = (query, includeQr = false) => query
  .populate('student', 'name loginId email')
  .populate('category', 'name requiresHod requiresDocument')
  .populate('department', 'name code').populate('academicYear', 'name level').populate('section', 'name')
  .populate('documents', 'originalName mimeType size uploadedAt storage')
  .populate({ path: 'pass', select: (includeQr ? '+qrCodeDataURL ' : '') + 'validFrom validUntil isRevoked issuedAt' });

const visibleRequest = async (user, id) => {
  const scope = await requestScope(user);
  return populateRequest(PermissionRequest.findOne({ _id: id, ...scope }), user.role === 'student');
};
const recordHistory = (request, actor, action, fromStatus, remarks) => ApprovalHistory.create({
  request: request._id, fromStatus, toStatus: request.status, action, actor: actor._id, actorRole: actor.role, remarks,
});

exports.list = asyncHandler(async (req, res) => {
  const scope = await requestScope(req.user);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const filter = { ...scope };
  if (req.query.status && Object.values(STATUS).includes(req.query.status)) filter.status = req.query.status;
  const [requests, total] = await Promise.all([
    populateRequest(PermissionRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
    PermissionRequest.countDocuments(filter),
  ]);
  res.json({ success: true, requests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.pending = asyncHandler(async (req, res) => {
  const scope = await requestScope(req.user);
  let status;
  if (req.user.role === 'faculty') status = 'pending_faculty';
  else if (req.user.role === 'hod') status = 'pending_hod';
  else if (req.query.status && Object.values(STATUS).includes(req.query.status)) status = req.query.status;
  const requests = await populateRequest(PermissionRequest.find({ ...scope, ...(status ? { status } : { status: { $in: ['pending_faculty', 'pending_hod'] } }) }).sort({ createdAt: 1 }).limit(100));
  res.json({ success: true, requests });
});

exports.create = asyncHandler(async (req, res) => {
  let request;
  let document;
  let storageKey;
  let storageType;
  try {
    const { category, reason, destination, contactPerson, contactPhone, startAt, endAt } = req.body;
    if (!mongoose.isValidObjectId(category)) throw new ApiError(400, 'Choose a valid permission category');
    if (!reason || String(reason).trim().length < 10) throw new ApiError(422, 'Please provide a reason of at least 10 characters');
    if (!destination || String(destination).trim().length < 2) throw new ApiError(422, 'Destination is required');
    const start = new Date(startAt); const end = new Date(endAt);
    if (!startAt || !endAt || Number.isNaN(+start) || Number.isNaN(+end) || end <= start) throw new ApiError(422, 'End time must be after start time');
    if (start <= new Date()) throw new ApiError(422, 'Start time must be in the future');
    const settings = await AppSettings.get();
    if (start > new Date(Date.now() + settings.advanceBookingDays * 86400000)) throw new ApiError(422, `Requests can be made up to ${settings.advanceBookingDays} days ahead`);
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (!profile) throw new ApiError(422, 'Your student profile is incomplete. Contact the administrator');
    const cat = await PermissionCategory.findOne({ _id: category, isActive: true });
    if (!cat) throw new ApiError(404, 'Permission category not found');
    if (cat.requiresDocument && !req.file) throw new ApiError(422, 'This category requires a supporting document');
    if (req.file && req.file.size > (req.uploadLimitMB || settings.maxFileSizeMB) * 1024 * 1024) throw new ApiError(413, 'Attachment must be ' + (req.uploadLimitMB || settings.maxFileSizeMB) + ' MB or smaller');
    if (end - start > cat.maxDurationHours * 60 * 60 * 1000) throw new ApiError(422, `This category is limited to ${cat.maxDurationHours} hours`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const todayCount = await PermissionRequest.countDocuments({ student: req.user._id, createdAt: { $gte: today, $lt: tomorrow } });
    if (todayCount >= settings.maxRequestsPerDay) throw new ApiError(429, `You can submit up to ${settings.maxRequestsPerDay} requests per day`);

    let verifiedFile;
    if (req.file) {
      verifiedFile = await documentStorage.inspectTemporaryFile(req.file);
      storageType = documentStorage.getStorageType();
      storageKey = await documentStorage.storeTemporaryFile(req.file.path, storageType, verifiedFile);
    }
    request = await PermissionRequest.create({
      requestId: makeRequestId(), student: req.user._id, department: profile.department, academicYear: profile.academicYear,
      section: profile.section, category: cat._id, reason: String(reason).trim(), destination: String(destination).trim(),
      contactPerson: contactPerson ? String(contactPerson).trim() : undefined,
      contactPhone: contactPhone ? String(contactPhone).trim() : undefined,
      startAt: start, endAt: end, requiresHod: cat.requiresHod, status: STATUS.PENDING_FACULTY, submittedAt: new Date(),
    });
    if (verifiedFile) {
      document = await PermissionDocument.create({
        request: request._id, uploadedBy: req.user._id, originalName: verifiedFile.originalName,
        storageKey, mimeType: verifiedFile.mimeType, size: verifiedFile.size, storage: storageType, uploadedAt: new Date(),
      });
      request.documents.push(document._id);
      await request.save();
    }
    await recordHistory(request, req.user, 'submit', STATUS.DRAFT, 'Request submitted');
    await logAudit(req, 'permission.submit', { entity: 'PermissionRequest', entityId: request._id });
    return res.status(201).json({ success: true, message: 'Permission request submitted', request: await visibleRequest(req.user, request._id) });
  } catch (error) {
    if (request) {
      await ApprovalHistory.deleteMany({ request: request._id }).catch(() => {});
      await PermissionRequest.deleteOne({ _id: request._id }).catch(() => {});
    }
    if (document) await PermissionDocument.deleteOne({ _id: document._id }).catch(() => {});
    if (storageKey) await documentStorage.deleteStoredFile(storageKey, storageType).catch(() => {});
    throw error;
  } finally {
    if (req.file?.path) await documentStorage.removeTemporaryFile(req.file.path);
  }
});
exports.getOne = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid request ID');
  const request = await visibleRequest(req.user, req.params.id);
  if (!request) throw new ApiError(404, 'Permission request not found');
  const history = await ApprovalHistory.find({ request: request._id }).sort({ createdAt: 1 }).populate('actor', 'name role');
  res.json({ success: true, request, history });
});

const approve = async (req, res, role) => {
  const request = await PermissionRequest.findById(req.params.id);
  if (!request) throw new ApiError(404, 'Permission request not found');
  const scope = await requestScope(req.user);
  if (role === 'faculty' && !(scope.section && scope.section.$in.some((s) => String(s) === String(request.section)))) throw new ApiError(403, 'This request is outside your assigned sections');
  if (role === 'hod' && String(scope.department) !== String(request.department)) throw new ApiError(403, 'This request is outside your department');
  const expected = role === 'faculty' ? 'pending_faculty' : 'pending_hod';
  if (request.status !== expected) throw new ApiError(409, 'This request is no longer awaiting your review');
  const { action, remarks = '' } = req.body;
  if (!['approve', 'reject'].includes(action)) throw new ApiError(422, 'Action must be approve or reject');
  if (action === 'reject' && String(remarks).trim().length < 3) throw new ApiError(422, 'Please include a reason when rejecting');
  const previous = request.status;
  if (action === 'reject') {
    request.status = STATUS.REJECTED;
    if (role === 'faculty') request.facultyDecision = { status: 'rejected', by: req.user._id, remarks: String(remarks).trim(), at: new Date() };
    else request.hodDecision = { status: 'rejected', by: req.user._id, remarks: String(remarks).trim(), at: new Date() };
  } else if (role === 'faculty') {
    request.facultyDecision = { status: 'approved', by: req.user._id, remarks: String(remarks).trim(), at: new Date() };
    request.status = request.requiresHod ? STATUS.PENDING_HOD : STATUS.APPROVED;
    if (!request.requiresHod) request.finalApprovedAt = new Date();
  } else {
    request.hodDecision = { status: 'approved', by: req.user._id, remarks: String(remarks).trim(), at: new Date() };
    request.status = STATUS.APPROVED; request.finalApprovedAt = new Date();
  }
  if (request.status === STATUS.APPROVED) {
    const rawToken = randomToken();
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify({ requestId: request.requestId, token: rawToken }), { width: 280, margin: 1 });
    const pass = await PermissionPass.create({ request: request._id, student: request.student, tokenHash: sha256(rawToken), qrCodeDataURL, validFrom: request.startAt, validUntil: request.endAt });
    request.pass = pass._id; request.status = STATUS.PASS_GENERATED;
  }
  await request.save();
  await recordHistory(request, req.user, `${role}_${action}`, previous, String(remarks).trim());
  await logAudit(req, `permission.${role}_${action}`, { entity: 'PermissionRequest', entityId: request._id });
  const student = await User.findById(request.student);
  if (student) await notify(student._id, { type: action === 'approve' ? `${role}_approved` : `${role}_rejected`, title: action === 'approve' ? 'Request approved' : 'Request declined', message: action === 'approve' ? 'Your permission request has moved forward.' : `Your request was declined: ${String(remarks).trim()}`, request: request._id });
  res.json({ success: true, message: action === 'approve' ? 'Request approved' : 'Request rejected', request: await visibleRequest(req.user, request._id) });
};
exports.reviewFaculty = asyncHandler((req, res) => approve(req, res, 'faculty'));
exports.reviewHod = asyncHandler((req, res) => approve(req, res, 'hod'));

exports.cancel = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid request ID');
  const request = await PermissionRequest.findOne({ _id: req.params.id, student: req.user._id });
  if (!request) throw new ApiError(404, 'Permission request not found');
  if (!['submitted', 'pending_faculty', 'pending_hod'].includes(request.status)) throw new ApiError(409, 'This request can no longer be cancelled');
  const previous = request.status; request.status = STATUS.CANCELLED; await request.save();
  await recordHistory(request, req.user, 'cancel', previous, 'Cancelled by student');
  res.json({ success: true, message: 'Request cancelled', request });
});

exports.verifyPass = asyncHandler(async (req, res) => {
  const { requestId, token } = req.body;
  if (!requestId || !token) throw new ApiError(422, 'QR code must include a request ID and token');
  const request = await PermissionRequest.findOne({ requestId }).populate('student', 'name loginId').populate('category', 'name');
  if (!request || !request.pass) {
    await QrVerification.create({ verifiedBy: req.user._id, result: 'not_found', message: 'No pass found', ip: req.ip });
    throw new ApiError(404, 'Pass not found');
  }
  const pass = await PermissionPass.findById(request.pass);
  let result = 'valid'; let message = 'Pass is valid';
  if (pass.isRevoked) { result = 'revoked'; message = 'Pass has been revoked'; }
  else if (sha256(String(token)) !== pass.tokenHash) { result = 'invalid'; message = 'QR code is invalid'; }
  else if (Date.now() < +pass.validFrom) { result = 'not_yet_valid'; message = 'Pass is not valid yet'; }
  else if (Date.now() > +pass.validUntil) { result = 'expired'; message = 'Pass has expired'; }
  await QrVerification.create({ pass: pass._id, request: request._id, verifiedBy: req.user._id, result, message, ip: req.ip });
  res.status(result === 'valid' ? 200 : 422).json({ success: result === 'valid', result, message, request: { requestId: request.requestId, student: request.student, category: request.category, destination: request.destination, startAt: request.startAt, endAt: request.endAt } });
});


exports.getDocument = asyncHandler(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.documentId)) throw new ApiError(400, 'Invalid document ID');
  const document = await PermissionDocument.findById(req.params.documentId).select('+data');
  if (!document) throw new ApiError(404, 'Document not found');
  const scope = await requestScope(req.user);
  if (!(await PermissionRequest.exists({ _id: document.request, ...scope }))) throw new ApiError(404, 'Document not found');
  const filename = document.originalName.replace(/["\\\r\n]/g, '_');
  res.set('Content-Type', document.mimeType);
  res.set('Content-Disposition', `inline; filename="${filename}"`);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, no-store');
  if (document.data) return res.send(document.data);
  if (document.storage !== 'local' || !document.storageKey) throw new ApiError(404, 'Document file is unavailable');
  const stream = documentStorage.createReadStream(document.storageKey);
  stream.on('error', (error) => {
    if (res.headersSent) return res.destroy(error);
    if (error.code === 'ENOENT') return next(new ApiError(404, 'Document file is unavailable'));
    next(error);
  });
  stream.pipe(res);
});


