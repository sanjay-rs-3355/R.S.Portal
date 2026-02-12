// middleware/taskMiddleware.js

const db = require('../config/db');

const requireTaskOwner = async (req, res, next) => {
    const taskId = req.params.id;
    const userId = req.user.id;

    try {
        const [rows] = await db.execute(
            'SELECT assigned_to FROM tasks WHERE id = ?',
            [taskId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Task not found.' });
        }

        if (rows[0].assigned_to !== userId) {
            return res.status(403).json({ message: 'You can only update your own tasks.' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = requireTaskOwner;
