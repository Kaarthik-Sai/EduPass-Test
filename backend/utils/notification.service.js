const { Notification, AppSettings } = require('../models');
const { sendEmail } = require('./email.service');

exports.notify = async (userId, { type = 'system', title, message, request }) => {
  const settings = await AppSettings.get();
  if (!settings.notifications.inApp) return null;
  return Notification.create({ user: userId, type, title, message, request });
};

exports.notifyMany = async (userIds, payload) =>
  Promise.all([...new Set(userIds.map(String))].map((id) => exports.notify(id, payload)));

exports.notifyEmail = async (user, subject, text) => {
  const settings = await AppSettings.get();
  if (settings.notifications.email) await sendEmail({ to: user.email, subject, text });
};
