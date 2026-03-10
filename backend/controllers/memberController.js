// controllers/memberController.js

const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

const addMember = async (req, res, next) => {
    const projectId = req.params.id;
    const { email } = req.body; // Changed from userId to email
    const requesterId = req.user.id;

    try {
        // 1. Find user by email
        const [userRows] = await db.execute(
            'SELECT id, name FROM users WHERE email = ? AND status = "active"',
            [email]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ message: 'User not found or inactive' });
        }

        const userToAdd = userRows[0];
        const userId = userToAdd.id;

        // 2. Add to project
        await db.execute(
            'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
            [projectId, userId]
        );

        await logActivity(requesterId, projectId, `👤 ${userToAdd.name} added to project`, 'member');

        res.status(201).json({ message: 'Member added successfully' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'User already a member of this project' });
        }
        next(error);
    }
};

const removeMember = async (req, res, next) => {
    const projectId = req.params.id;
    const userId = req.params.userId;
    const requesterId = req.user.id;

    try {
        // Get user name for logging
        const [[userToRemove]] = await db.execute('SELECT name FROM users WHERE id = ?', [userId]);

        const [result] = await db.execute(
            'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
            [projectId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Member not found in project' });
        }

        await db.execute(
            'UPDATE tasks SET assigned_to = NULL WHERE project_id = ? AND assigned_to = ?',
            [projectId, userId]
        );

        if (userToRemove) {
            await logActivity(requesterId, projectId, `👤 ${userToRemove.name} removed from project`, 'member');
        }

        res.json({ message: 'Member removed and tasks unassigned' });

    } catch (error) {
        next(error);
    }
};

const getProjectMembers = async (req, res, next) => {
    const projectId = req.params.id;

    try {
        const [rows] = await db.execute(
            `
            SELECT u.id, u.name, u.email, u.role
            FROM users u
            JOIN project_members pm ON u.id = pm.user_id
            WHERE pm.project_id = ?
            `,
            [projectId]
        );

        res.json(rows);

    } catch (error) {
        next(error);
    }
};

module.exports = {
    addMember,
    removeMember,
    getProjectMembers
};
