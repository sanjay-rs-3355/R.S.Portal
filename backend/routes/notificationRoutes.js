const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const notificationController = require('../controllers/notificationController');

router.get('/', verifyToken, notificationController.getNotifications);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);
router.delete('/clear-all', verifyToken, notificationController.deleteAllNotifications);
router.put('/:id/read', verifyToken, notificationController.markAsRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;
