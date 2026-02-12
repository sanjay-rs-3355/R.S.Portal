const db = require('../config/db');

const logActivity = async (userId, projectId, action) => {
    try {
        await db.execute(
            'INSERT INTO activity_logs (user_id, project_id, action) VALUES (?, ?, ?)',
            [userId, projectId || null, action]
        );
    } catch (error) {
        console.error("Activity log error:", error);
    }
};

module.exports = logActivity;
