const db = require('../config/db');

const getMessages = async (req, res, next) => {
    const projectId = req.params.id;

    try {
        const [rows] = await db.execute(
            `
            SELECT 
                m.id,
                m.message,
                m.sent_at,
                u.name,
                u.id AS userId
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.project_id = ?
            ORDER BY m.sent_at ASC
            `,
            [projectId]
        );

        res.json(rows);

    } catch (error) {
        next(error);
    }
};

module.exports = { getMessages };
