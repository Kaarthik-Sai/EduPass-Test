// Minimal email service. With no SMTP configured it logs to the console (dev only).
// Add nodemailer here when SMTP credentials are available.
exports.sendEmail = async ({ to, subject, text }) => {
  if (!process.env.SMTP_HOST) {
    if (process.env.NODE_ENV !== 'production') console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return { logged: true };
  }
  // TODO(phase 2): nodemailer transport using SMTP_* env vars
  console.warn('SMTP configured but transport not implemented yet; email not sent');
  return { sent: false };
};
