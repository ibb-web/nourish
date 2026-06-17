const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, enum: ['meal_reminder', 'hydration', 'weekly_summary', 'promo', 'custom'] },
    enabled: { type: Boolean, default: true },
    schedule: { type: String, default: '' }, // cron or ISO time
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSentAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
