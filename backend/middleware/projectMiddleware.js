// middleware/projectMiddleware.js

const db = require('../config/db');

const requireProjectMember = async (req, res, next) => {
    const projectId = req.params.id;
    const userId = req.user.id;

    try {
        // Admin bypass
        if (req.user.role === 'admin') {
            return next();
        }

        const [rows] = await db.execute(
            'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ message: 'Access denied. Not a project member.' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = requireProjectMember;
