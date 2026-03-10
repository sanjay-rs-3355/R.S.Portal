const db = require('../config/db');

/**
 * Logs an activity to the database and updates the project's last activity.
 * @param {number} userId - The ID of the user performing the action.
 * @param {number|null} projectId - The ID of the project related to the action (optional).
 * @param {string} action - A description of the action.
 * @param {string} type - The type of activity ('task', 'file', 'member', 'chat').
 */
const logActivity = async (userId, projectId, action, type = null) => {
    try {
        // 1. Insert into activity_logs
        await db.execute(
            'INSERT INTO activity_logs (user_id, project_id, action) VALUES (?, ?, ?)',
            [userId, projectId, action]
        );

        // 2. If projectId is provided, update the projects table
        if (projectId && type) {
            await db.execute(
                `UPDATE projects 
                 SET last_activity_text = ?, 
                     last_activity_type = ?, 
                     last_activity_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [action, type, projectId]
            );
        }
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};

module.exports = logActivity;
