const ROLES = Object.freeze({ STUDENT: 'student', FACULTY: 'faculty', HOD: 'hod', ADMIN: 'admin' });

const STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_FACULTY: 'pending_faculty',
  FACULTY_APPROVED: 'faculty_approved',
  PENDING_HOD: 'pending_hod',
  APPROVED: 'approved',
  PASS_GENERATED: 'pass_generated',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
});

const NOTIFICATION_TYPES = [
  'request_submitted', 'faculty_approved', 'faculty_rejected', 'hod_approved', 'hod_rejected',
  'final_approved', 'pass_available', 'expiry_upcoming', 'expired', 'pending_review', 'system',
];

module.exports = { ROLES, STATUS, NOTIFICATION_TYPES };
