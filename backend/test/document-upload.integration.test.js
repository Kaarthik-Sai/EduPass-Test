const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const mongoUri = process.env.EDUPASS_TEST_MONGO_URI;
if (!mongoUri) {
  test('document upload integration (set EDUPASS_TEST_MONGO_URI to a disposable *_test database)', { skip: true }, () => {});
} else {
  const parsed = new URL(mongoUri);
  if (!parsed.pathname.toLowerCase().includes('_test')) throw new Error('EDUPASS_TEST_MONGO_URI must target a database whose name contains _test');
  const privateRoot = path.join(os.tmpdir(), `edupass-private-test-${crypto.randomUUID()}`);
  process.env.PRIVATE_UPLOAD_DIR = privateRoot;
  process.env.NODE_ENV = 'test';
  const documentStorage = require('../utils/document-storage.service');
  const mongoose = require('mongoose');
  const app = require('../app');
  const { User, Department, AcademicYear, Section, StudentProfile, FacultyProfile, FacultySectionMapping, HodProfile, PermissionCategory, PermissionRequest, PermissionDocument, AppSettings } = require('../models');
  let server; let base; let studentToken; let otherStudentToken; let facultyToken; let hodToken; let category; let storedDocumentId; let requestId;
  const pdf = Buffer.from('%PDF-1.7\nEduPass private upload integration fixture\n');

  before(async () => {
    await mongoose.connect(mongoUri);
    await mongoose.connection.dropDatabase();
    const department = await Department.create({ name: 'Integration Test Department', code: `T${crypto.randomBytes(3).toString('hex').toUpperCase()}` });
    const year = await AcademicYear.create({ name: `Test ${Date.now()}`, level: 1 });
    const section = await Section.create({ name: 'Z', department: department._id, academicYear: year._id });
    const student = await User.create({ name: 'Test Student', email: `student-${Date.now()}@example.test`, loginId: `S${Date.now()}`, password: 'StudentPass123', role: 'student', department: department._id });
    const other = await User.create({ name: 'Other Student', email: `other-${Date.now()}@example.test`, loginId: `O${Date.now()}`, password: 'StudentPass123', role: 'student', department: department._id });
    const faculty = await User.create({ name: 'Test Faculty', email: `faculty-${Date.now()}@example.test`, loginId: `F${Date.now()}`, password: 'FacultyPass123', role: 'faculty', department: department._id });
    const hod = await User.create({ name: 'Test HOD', email: `hod-${Date.now()}@example.test`, loginId: `H${Date.now()}`, password: 'HodPass1234', role: 'hod', department: department._id });
    await StudentProfile.create({ user: student._id, department: department._id, academicYear: year._id, section: section._id });
    await StudentProfile.create({ user: other._id, department: department._id, academicYear: year._id, section: section._id });
    await FacultyProfile.create({ user: faculty._id, department: department._id });
    await FacultySectionMapping.create({ faculty: faculty._id, section: section._id });
    await HodProfile.create({ user: hod._id, department: department._id });
    await AppSettings.create({ key: 'global', maxFileSizeMB: 1 });
    category = await PermissionCategory.create({ name: `Test category ${Date.now()}`, slug: `test-${Date.now()}`, requiresHod: true, requiresDocument: true, maxDurationHours: 8 });
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
    async function login(loginId) {
      const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId, password: 'StudentPass123' }) });
      return (await response.json()).token;
    }
    studentToken = await login(student.loginId);
    otherStudentToken = await login(other.loginId);
    const staffLogin = async (user, password) => {
      const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: user.loginId, password }) });
      return (await response.json()).token;
    };
    facultyToken = await staffLogin(faculty, 'FacultyPass123');
    hodToken = await staffLogin(hod, 'HodPass1234');
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
    await fs.rm(privateRoot, { recursive: true, force: true });
  });

  const formFor = (includeDocument = true) => {
    const form = new FormData();
    form.append('category', String(category._id));
    form.append('reason', 'Supporting document end-to-end integration test');
    form.append('destination', 'Test destination');
    form.append('startAt', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    form.append('endAt', new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString());
    if (includeDocument) form.append('document', new Blob([pdf], { type: 'application/pdf' }), 'evidence.pdf');
    return form;
  };
  const postRequest = (token, body) => fetch(`${base}/permissions`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });

  test('submission stores metadata privately, scopes reads, and preserves approvals', async () => {
    const response = await postRequest(studentToken, formFor());
    if (response.status !== 201) assert.fail("Expected 201, received " + response.status + ": " + await response.text());
    const data = await response.json();
    requestId = data.request._id;
    assert.equal(data.request.documents.length, 1);
    assert.equal(data.request.documents[0].originalName, 'evidence.pdf');
    assert.equal(data.request.documents[0].mimeType, 'application/pdf');
    assert.equal(data.request.documents[0].size, pdf.length);
    assert.equal(data.request.documents[0].storage, 'local');
    assert.equal(Object.hasOwn(data.request.documents[0], 'storageKey'), false);
    assert.equal(Object.hasOwn(data.request.documents[0], 'data'), false);
    storedDocumentId = data.request.documents[0]._id;

    const download = async (token) => fetch(`${base}/permissions/documents/${storedDocumentId}`, { headers: { Authorization: `Bearer ${token}` } });
    const own = await download(studentToken);
    assert.equal(own.status, 200);
    assert.equal(own.headers.get('content-type'), 'application/pdf');
    assert.equal(own.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(Buffer.from(await own.arrayBuffer()), pdf);
    assert.equal((await download(facultyToken)).status, 200);
    assert.equal((await download(otherStudentToken)).status, 404);

    const facultyDecision = await fetch(`${base}/permissions/${requestId}/review`, { method: 'POST', headers: { Authorization: `Bearer ${facultyToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'approve', remarks: 'Supporting document reviewed' }) });
    assert.equal(facultyDecision.status, 200);
    assert.equal((await facultyDecision.json()).request.status, 'pending_hod');
    const hodDecision = await fetch(`${base}/permissions/${requestId}/review-hod`, { method: 'POST', headers: { Authorization: `Bearer ${hodToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'approve', remarks: 'Approved for test' }) });
    assert.equal(hodDecision.status, 200);
    assert.equal((await hodDecision.json()).request.status, 'pass_generated');
    assert.equal((await download(facultyToken)).status, 200);
  });

  test('review notifications can be listed and marked read only by their owner', async () => {
    const headers = { Authorization: `Bearer ${studentToken}` };
    const response = await fetch(`${base}/notifications`, { headers });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.unread > 0);
    assert.ok(data.notifications.length > 0);
    const notification = data.notifications[0];
    const marked = await fetch(`${base}/notifications/${notification._id}/read`, { method: 'PATCH', headers });
    assert.equal(marked.status, 200);
    const forbidden = await fetch(`${base}/notifications/${notification._id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${otherStudentToken}` } });
    assert.equal(forbidden.status, 404);
  });
  test('rejection remains available and does not remove the submitted document', async () => {
    const submitted = await postRequest(otherStudentToken, formFor());
    assert.equal(submitted.status, 201, await submitted.clone().text());
    const data = await submitted.json();
    const secondDocId = data.request.documents[0]._id;
    const rejected = await fetch(`${base}/permissions/${data.request._id}/review`, { method: 'POST', headers: { Authorization: `Bearer ${facultyToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'reject', remarks: 'Integration test rejection' }) });
    assert.equal(rejected.status, 200);
    assert.equal((await rejected.json()).request.status, 'rejected');
    const read = await fetch(`${base}/permissions/documents/${secondDocId}`, { headers: { Authorization: `Bearer ${facultyToken}` } });
    assert.equal(read.status, 200);
    const unrelated = await fetch(`${base}/permissions/documents/${secondDocId}`, { headers: { Authorization: `Bearer ${studentToken}` } });
    assert.equal(unrelated.status, 404);
  });
  test('required files, file signatures, and the size limit are enforced', async () => {
    const limits = await fetch(base + '/categories', { headers: { Authorization: 'Bearer ' + studentToken } });
    assert.equal((await limits.json()).uploadLimitMB, 1);
    const missing = await postRequest(studentToken, formFor(false));
    assert.equal(missing.status, 422);
    assert.match((await missing.json()).message, /requires a supporting document/i);

    const mismatched = formFor(false);
    mismatched.append('document', new Blob([pdf], { type: 'image/jpeg' }), 'fake.jpg');
    const badSignature = await postRequest(studentToken, mismatched);
    assert.equal(badSignature.status, 415);

    const oversized = formFor(false);
    oversized.append('document', new Blob([Buffer.alloc(1 * 1024 * 1024 + 1)], { type: 'application/pdf' }), 'large.pdf');
    const tooLarge = await postRequest(studentToken, oversized);
    assert.equal(tooLarge.status, 413);
    assert.match((await tooLarge.json()).message, /1 MB or smaller/);
  });

  test('database write failures remove files already moved into private storage', async () => {
    const before = await fs.readdir(privateRoot);
    const invalid = formFor(); invalid.set('destination', 'D'.repeat(250));
    const response = await postRequest(studentToken, invalid);
    assert.equal(response.status, 422);
    assert.deepEqual(await fs.readdir(privateRoot), before);
    assert.equal(await PermissionRequest.countDocuments({ 'documents.0': { $exists: true } }), 2);
    assert.equal(await PermissionDocument.countDocuments({}), 2);
  });
  test('GridFS storage round-trips supporting documents', async () => {
    const filePath = path.join(os.tmpdir(), `edupass-gridfs-${crypto.randomUUID()}.pdf`);
    const content = Buffer.from('%PDF-1.7\nGridFS integration fixture\n');
    await fs.writeFile(filePath, content);
    let key;
    try {
      const file = { path: filePath, originalname: 'gridfs-proof.pdf', mimetype: 'application/pdf', size: content.length };
      const metadata = await documentStorage.inspectTemporaryFile(file);
      key = await documentStorage.storeTemporaryFile(filePath, 'gridfs', metadata);
      const chunks = [];
      for await (const chunk of documentStorage.createReadStream(key, 'gridfs')) chunks.push(chunk);
      assert.deepEqual(Buffer.concat(chunks), content);
    } finally {
      if (key) await documentStorage.deleteStoredFile(key, 'gridfs');
      await fs.rm(filePath, { force: true });
    }
  });
}




