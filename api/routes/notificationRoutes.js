const express = require('express');
const { listNotifications, createNotification, deleteNotification, sendTestEmail, runNotificationTick } = require('../controllers/notificationController');
const router = express.Router();

router.get('/', listNotifications);
router.post('/', createNotification);
router.post('/send-test', sendTestEmail);
router.post('/run-tick', runNotificationTick);
router.delete('/:id', deleteNotification);

module.exports = router;
