const Notification = require('../models/Notification');
const { sendMail } = require('../services/emailService');
const User = require('../models/User');
const { runSchedulerTick } = require('../services/notificationSchedulerService');

const listNotifications = async (req, res) => {
  try {
    const criteria = {};
    if (req.user) criteria.userId = req.user._id;
    const items = await Notification.find(criteria).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list notifications' });
  }
};

const createNotification = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.user) payload.userId = req.user._id;
    if (!payload.userId) return res.status(400).json({ message: 'userId required' });
    const n = await Notification.create(payload);
    return res.status(201).json(n);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const existing = await Notification.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Notification not found' });
    if (req.user && String(existing.userId) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
    await Notification.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete notification' });
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const { to } = req.body;
    let recipient = to;
    if (!recipient && req.user) {
      const u = await User.findById(req.user._id);
      recipient = u?.email;
    }
    if (!recipient) return res.status(400).json({ message: 'No recipient specified' });
    await sendMail({ to: recipient, subject: 'Test email from Nourish', text: 'This is a test email.' });
    return res.json({ message: 'Email sent (or queued)'});
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Failed to send email' });
  }
};

const runNotificationTick = async (req, res) => {
  try {
    await runSchedulerTick();
    return res.json({ message: 'Notification scheduler tick completed' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to run scheduler tick' });
  }
};

module.exports = { listNotifications, createNotification, deleteNotification, sendTestEmail, runNotificationTick };
