const nodemailer = require('nodemailer');
let transport;

const getTransport = () => {
  if (transport) return transport;
  if (!process.env.SMTP_HOST) return null;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transport;
};

exports.sendEmail = async ({ to, subject, text }) => {
  const mailer = getTransport();
  if (!mailer) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email delivery is not configured');
    console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
    return { logged: true };
  }
  return mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to, subject, text,
  });
};
