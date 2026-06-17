const cron = require('node-cron');
const Notification = require('../models/Notification');
const { sendMail } = require('./emailService');
const { buildWeeklySummaryForUser } = require('./weeklySummaryService');

let schedulerTask = null;

const WEEKDAY_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function defaultSchedule(type) {
  if (type === 'meal_reminder') return 'daily:08:00';
  if (type === 'hydration') return 'daily:10:00';
  if (type === 'weekly_summary') return 'weekly:Sun:18:00';
  if (type === 'promo') return 'weekly:Fri:12:00';
  return 'daily:09:00';
}

function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isDueDaily(now, hhmm, lastSentAt) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return false;
  if (now.getHours() !== h || now.getMinutes() !== m) return false;
  if (!lastSentAt) return true;
  return !isSameLocalDay(new Date(lastSentAt), now);
}

function isDueWeekly(now, dayToken, hhmm, lastSentAt) {
  const weekday = WEEKDAY_MAP[String(dayToken || '').toLowerCase().slice(0, 3)];
  if (weekday === undefined) return false;
  if (now.getDay() !== weekday) return false;
  if (!isDueDaily(now, hhmm, null)) return false;
  if (!lastSentAt) return true;
  return !isSameLocalDay(new Date(lastSentAt), now);
}

function shouldSendNow(notification, now = new Date()) {
  const schedule = (notification.schedule || defaultSchedule(notification.type)).trim();

  if (schedule.startsWith('daily:')) {
    const hhmm = schedule.replace('daily:', '');
    return isDueDaily(now, hhmm, notification.lastSentAt);
  }

  if (schedule.startsWith('weekly:')) {
    const [, dayToken, hhmm] = schedule.split(':');
    return isDueWeekly(now, dayToken, hhmm, notification.lastSentAt);
  }

  // unsupported formats are ignored in this simple scheduler
  return false;
}

function buildGenericNotificationEmail(notification, user) {
  const typeLabel = notification.type.replace(/_/g, ' ');
  const customSubject = notification.payload?.subject;
  const customText = notification.payload?.text;

  const subject = customSubject || `Nourish ${typeLabel} reminder`;
  const text = customText || `Hi ${user.name || 'there'}, this is your ${typeLabel} reminder.`;
  const html = `<p>Hi ${user.name || 'there'},</p><p>${text}</p>`;
  return { subject, text, html };
}

async function processNotification(notification) {
  const user = notification.userId;
  if (!user?.email) return;

  let emailContent;
  if (notification.type === 'weekly_summary') {
    emailContent = await buildWeeklySummaryForUser(user);
  } else {
    emailContent = buildGenericNotificationEmail(notification, user);
  }

  await sendMail({
    to: user.email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  notification.lastSentAt = new Date();
  await notification.save();
}

async function runSchedulerTick() {
  const now = new Date();
  const notifications = await Notification.find({ enabled: true }).populate('userId');

  for (const notification of notifications) {
    try {
      if (!shouldSendNow(notification, now)) continue;
      await processNotification(notification);
    } catch (err) {
      // keep scheduler resilient if one notification fails
      console.error('Notification send failed:', err.message);
    }
  }
}

function startNotificationScheduler() {
  const enabled = String(process.env.ENABLE_NOTIFICATION_SCHEDULER || 'true').toLowerCase() === 'true';
  if (!enabled) {
    console.log('Notification scheduler disabled by env');
    return null;
  }
  if (schedulerTask) return schedulerTask;

  schedulerTask = cron.schedule('* * * * *', async () => {
    await runSchedulerTick();
  });

  console.log('Notification scheduler started');
  return schedulerTask;
}

function stopNotificationScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
  }
}

module.exports = {
  startNotificationScheduler,
  stopNotificationScheduler,
  runSchedulerTick,
  shouldSendNow,
};
