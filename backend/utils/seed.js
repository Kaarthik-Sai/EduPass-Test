/* Development seed data. Usage: npm run seed | npm run seed:destroy
 * Refuses to run when NODE_ENV=production. Keep this data out of production DBs. */
require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const connectDB = require('../config/db');
const M = require('../models');
const { ROLES, STATUS } = require('../config/constants');
const makeRequestId = require('./requestId');
const { randomToken, sha256 } = require('./token');

const PASSWORD = 'Edupass@123';
const H = 3600 * 1000;
const now = Date.now();

const CATEGORIES = [
  ['Internship', true, true], ['College Event', false, false], ['Workshop / FDP', false, true],
  ['Competition', false, true], ['Project Work', false, false], ['Company Visit', true, true],
  ['Medical', false, true], ['Personal', true, false], ['Other Approved Purpose', true, false],
];
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function destroy() {
  await Promise.all(Object.values(M).map((m) => m.deleteMany({})));
  console.log('All collections cleared');
}

async function seed() {
  await destroy();
  await M.AppSettings.get();

  const years = await M.AcademicYear.insertMany(
    ['1st Year', '2nd Year', '3rd Year', '4th Year'].map((name, i) => ({ name, level: i + 1 })));
  const depts = await M.Department.insertMany([
    { name: 'Computer Science & Engineering', code: 'CSE' },
    { name: 'Electronics & Communication Engineering', code: 'ECE' },
  ]);

  const sectionDocs = [];
  for (const d of depts) for (const y of years) for (const s of 'ABCDEF')
    sectionDocs.push({ name: s, department: d._id, academicYear: y._id });
  const sections = await M.Section.insertMany(sectionDocs);
  const sec = (dept, yearLevel, name) => sections.find((s) =>
    String(s.department) === String(dept._id) && String(s.academicYear) === String(years[yearLevel - 1]._id) && s.name === name);

  const cats = await M.PermissionCategory.insertMany(CATEGORIES.map(([name, requiresHod, requiresDocument]) =>
    ({ name, slug: slug(name), requiresHod, requiresDocument })));
  const cat = (name) => cats.find((c) => c.name === name);

  const mk = (o) => new M.User({ password: PASSWORD, ...o }).save();
  const admin = await mk({ name: 'System Admin', email: 'admin@edupass.test', loginId: 'ADMIN001', role: ROLES.ADMIN });

  const hods = [];
  for (const [i, d] of depts.entries()) {
    const u = await mk({ name: `Dr. ${d.code} Head`, email: `hod.${d.code.toLowerCase()}@edupass.test`,
      loginId: `HOD${d.code}`, role: ROLES.HOD, department: d._id });
    await M.HodProfile.create({ user: u._id, department: d._id });
    await M.Department.updateOne({ _id: d._id }, { hod: u._id });
    hods.push(u);
  }

  const cse = depts[0];
  const facultyDefs = [
    ['Prof. Anita Rao', 'FAC101', [[1, 'A'], [1, 'B'], [2, 'A']]],
    ['Prof. Vikram Singh', 'FAC102', [[2, 'B'], [3, 'A'], [3, 'B']]],
    ['Prof. Meera Nair', 'FAC103', [[4, 'A'], [4, 'B']]],
  ];
  const faculty = [];
  for (const [name, loginId, maps] of facultyDefs) {
    const u = await mk({ name, email: `${loginId.toLowerCase()}@edupass.test`, loginId, role: ROLES.FACULTY, department: cse._id });
    await M.FacultyProfile.create({ user: u._id, department: cse._id, designation: 'Assistant Professor' });
    await M.FacultySectionMapping.insertMany(maps.map(([y, s]) => ({ faculty: u._id, section: sec(cse, y, s)._id })));
    faculty.push(u);
  }

  const students = [];
  const studentDefs = [
    ['Aarav Sharma', '1A', 1, 'A'], ['Diya Patel', '1B', 1, 'A'], ['Rohan Gupta', '1C', 1, 'B'],
    ['Sneha Iyer', '2A', 2, 'A'], ['Karan Mehta', '2B', 2, 'B'], ['Priya Reddy', '3A', 3, 'A'],
    ['Arjun Das', '3B', 3, 'B'], ['Isha Verma', '4A', 4, 'A'],
  ];
  for (const [i, [name, , y, s]] of studentDefs.entries()) {
    const loginId = `21CSE${String(i + 1).padStart(3, '0')}`;
    const u = await mk({ name, email: `${loginId.toLowerCase()}@edupass.test`, loginId, role: ROLES.STUDENT, department: cse._id });
    await M.StudentProfile.create({ user: u._id, department: cse._id, academicYear: years[y - 1]._id, section: sec(cse, y, s)._id });
    students.push({ user: u, y, s });
  }

  // requests across lifecycle stages
  const plan = [
    [0, 'Internship', STATUS.PENDING_FACULTY, -2, 6, 'Summer internship onboarding day at a partner company', 'TechNova Pvt Ltd'],
    [1, 'Medical', STATUS.PENDING_FACULTY, 1, 3, 'Dental appointment scheduled with city hospital', 'City Dental Hospital'],
    [3, 'Company Visit', STATUS.PENDING_HOD, 24, 8, 'Industrial visit organised by department club', 'Infosys Campus'],
    [4, 'Workshop / FDP', STATUS.APPROVED, 24, 5, 'Hands-on cloud workshop at partner institute', 'IIIT Workshop Hall'],
    [5, 'Competition', STATUS.PASS_GENERATED, -1, 2, 'Inter-college hackathon final round', 'NIT Convention Centre'],
    [2, 'Personal', STATUS.REJECTED, 48, 4, 'Family function attendance in the city', 'Home'],
    [6, 'Project Work', STATUS.EXPIRED, -30, -26, 'Final-year project data collection visit', 'Local Industry Park'],
    [7, 'College Event', STATUS.COMPLETED, -50, -46, 'Volunteer duty at the annual tech fest', 'Main Auditorium'],
  ];
  for (const [si, catName, status, startOffsetH, endOffsetH, reason, destination] of plan) {
    const st = students[si]; const c = cat(catName);
    const startAt = new Date(now + startOffsetH * H);
    const endAt = new Date(now + (startOffsetH < 0 && endOffsetH < 0 ? endOffsetH : startOffsetH + Math.abs(endOffsetH)) * H);
    const fin = ![STATUS.PENDING_FACULTY].includes(status);
    const reqDoc = await M.PermissionRequest.create({
      requestId: makeRequestId(), student: st.user._id, department: cse._id, academicYear: years[st.y - 1]._id,
      section: sec(cse, st.y, st.s)._id, category: c._id, reason, destination, startAt, endAt, status,
      requiresHod: c.requiresHod, submittedAt: new Date(now - 5 * H),
      facultyDecision: fin ? { status: status === STATUS.REJECTED ? 'rejected' : 'approved', by: faculty[0]._id,
        remarks: status === STATUS.REJECTED ? 'Internal exams are scheduled; please reapply later' : 'Approved', at: new Date(now - 3 * H) } : {},
      hodDecision: [STATUS.APPROVED, STATUS.PASS_GENERATED, STATUS.EXPIRED, STATUS.COMPLETED].includes(status) && c.requiresHod
        ? { status: 'approved', by: hods[0]._id, remarks: 'Approved', at: new Date(now - 2 * H) } : {},
      finalApprovedAt: [STATUS.APPROVED, STATUS.PASS_GENERATED, STATUS.EXPIRED, STATUS.COMPLETED].includes(status) ? new Date(now - 2 * H) : undefined,
    });
    await M.ApprovalHistory.create({ request: reqDoc._id, toStatus: STATUS.SUBMITTED, action: 'submit', actor: st.user._id, actorRole: 'student' });
    if (status !== STATUS.PENDING_FACULTY)
      await M.ApprovalHistory.create({ request: reqDoc._id, fromStatus: STATUS.PENDING_FACULTY, toStatus: status,
        action: status === STATUS.REJECTED ? 'faculty_reject' : 'faculty_approve', actor: faculty[0]._id, actorRole: 'faculty' });
    if ([STATUS.PASS_GENERATED, STATUS.EXPIRED, STATUS.COMPLETED].includes(status)) {
      const passToken = randomToken();
      const pass = await M.PermissionPass.create({ request: reqDoc._id, student: st.user._id,
        tokenHash: sha256(passToken), qrCodeDataURL: await QRCode.toDataURL(JSON.stringify({ requestId: reqDoc.requestId, token: passToken }), { width: 280, margin: 1 }), validFrom: startAt, validUntil: endAt });
      reqDoc.pass = pass._id; await reqDoc.save();
    }
  }

  console.log('\nSeed complete. All accounts use password:', PASSWORD);
  console.log('  Admin   : ADMIN001');
  console.log('  HOD     : HODCSE, HODECE');
  console.log('  Faculty : FAC101, FAC102, FAC103');
  console.log('  Student : 21CSE001 ... 21CSE008');
}

(async () => {
  if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed in production'); process.exit(1); }
  await connectDB();
  try { process.argv.includes('--destroy') ? await destroy() : await seed(); }
  catch (e) { console.error('Seed failed:', e); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();

