const db = require('../config/db');

/**
 * Logs an activity to the database.
 * @param {number} userId - The ID of the user performing the action.
 * @param {number|null} projectId - The ID of the project related to the action (optional).
 * @param {string} action - A description of the action.
 */
const logActivity = async (userId, projectId, action) => {
    try {
        await db.execute(
            'INSERT INTO activity_logs (user_id, project_id, action) VALUES (?, ?, ?)',
            [userId, projectId, action]
        );
    } catch (error) {
        console.error("Failed to log activity:", error);
        // We don't throw here to avoid failing the main request just because logging failed
    }
};

module.exports = logActivity;
