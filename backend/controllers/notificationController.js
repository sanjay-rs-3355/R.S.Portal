const db = require('../config/db');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const [notifications] = await db.execute(
            'SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [userId]
        );
        res.json(notifications);
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await db.execute(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [userId]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const deleteNotification = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;
        await db.execute(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

const deleteAllNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await db.execute(
            'DELETE FROM notifications WHERE user_id = ?',
            [userId]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
};
