const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

const createProject = async (req, res) => {
    const { title, description } = req.body;
    const adminId = req.user.id;

    try {
        const [result] = await db.execute(
            'INSERT INTO projects (title, description, created_by) VALUES (?, ?, ?)',
            [title, description, adminId]
        );

        // ✅ Must be inside async function
        await logActivity(adminId, result.insertId, "Created a new project");

        res.status(201).json({
            message: 'Project created successfully',
            projectId: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getProjects = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        let query;
        let values = [];

        // For "My Projects" view, we only want projects the user is a member of.
        // Even if admin, if they want to see "projects where I am part of", we filter.
        query = `
            SELECT p.* FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ? AND p.is_deleted = FALSE
        `;
        values = [userId];

        const [rows] = await db.execute(query, values);
        res.json(rows);

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getProjectById = async (req, res) => {
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
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteProject = async (req, res) => {
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
        res.status(500).json({ message: 'Server error' });
    }
};

const transferOwnership = async (req, res) => {
    const projectId = req.params.projectId;
    const newAdminId = req.params.newAdminId;

    try {
        const [[newAdmin]] = await db.execute(
            "SELECT id, role FROM users WHERE id = ?",
            [newAdminId]
        );

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
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    deleteProject,
    transferOwnership
};
