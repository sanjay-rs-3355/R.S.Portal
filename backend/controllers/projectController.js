const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

const createProject = async (req, res, next) => {
    const { title, description } = req.body;
    const userId = req.user.id;

    try {
        const [result] = await db.execute(
            'INSERT INTO projects (title, description, created_by) VALUES (?, ?, ?)',
            [title, description, userId]
        );

        const newProjectId = result.insertId;

        // Automatically add creator as a member
        await db.execute(
            'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
            [newProjectId, userId]
        );

        // ✅ Must be inside async function
        await logActivity(userId, newProjectId, "Created a new project");

        res.status(201).json({
            message: 'Project created successfully',
            projectId: newProjectId
        });

    } catch (error) {
        next(error);
    }
};

const getProjects = async (req, res, next) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        const progressQuery = `
            SELECT p.*, 
                   ROUND(COALESCE(SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(t.id), 0), 0)) as progress
            FROM projects p
            LEFT JOIN tasks t ON p.id = t.project_id
            WHERE p.is_deleted = FALSE 
            ${role === 'admin' ? '' : 'AND p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)'}
            GROUP BY p.id
            ORDER BY p.last_activity_at DESC
        `;
        const [rows] = await db.execute(progressQuery, role === 'admin' ? [] : [userId]);
        res.json(rows);

    } catch (error) {
        next(error);
    }
};

const getProjectById = async (req, res, next) => {
    const projectId = req.params.id;

    try {
        const [rows] = await db.execute(
            'SELECT * FROM projects WHERE id = ? AND is_deleted = FALSE',
            [projectId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(rows[0]);

    } catch (error) {
        next(error);
    }
};

const deleteProject = async (req, res, next) => {
    const projectId = req.params.id;

    try {
        const [result] = await db.execute(
            'UPDATE projects SET is_deleted = TRUE WHERE id = ?',
            [projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ message: 'Project deleted (soft delete)' });

    } catch (error) {
        next(error);
    }
};

const transferOwnership = async (req, res, next) => {
    const projectId = req.params.projectId;
    const newAdminId = req.params.newAdminId;

    try {
        const [rows] = await db.execute(
            "SELECT id, role FROM users WHERE id = ?",
            [newAdminId]
        );
        const newAdmin = rows[0];

        if (!newAdmin) {
            return res.status(404).json({ message: "New admin not found" });
        }

        if (newAdmin.role !== 'admin') {
            return res.status(400).json({ message: "User must be an admin to own project" });
        }

        await db.execute(
            "UPDATE projects SET created_by = ? WHERE id = ?",
            [newAdminId, projectId]
        );

        res.json({ message: "Project ownership transferred successfully" });

    } catch (error) {
        next(error);
    }
};

const updateProject = async (req, res, next) => {
    const projectId = req.params.id;
    const { title, description } = req.body;
    const userId = req.user.id;

    try {
        const [existing] = await db.execute(
            'SELECT id FROM projects WHERE id = ? AND is_deleted = FALSE',
            [projectId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Project not found' });
        }

        await db.execute(
            'UPDATE projects SET title = ?, description = ? WHERE id = ?',
            [title, description || null, projectId]
        );

        await logActivity(userId, projectId, `Updated project details: "${title}"`, 'project');

        res.json({ message: 'Project updated successfully' });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    deleteProject,
    updateProject,
    transferOwnership
};
