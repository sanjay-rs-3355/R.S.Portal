const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

const createTask = async (req, res) => {
    const projectId = req.params.id;
    const { title, description, assigned_to, priority, deadline } = req.body;
    const userId = req.user.id; // User creating the task

    try {
        if (assigned_to) {
            const [memberRows] = await db.execute(
                'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
                [projectId, assigned_to]
            );

            if (memberRows.length === 0) {
                return res.status(400).json({
                    message: 'Assigned user is not a member of this project'
                });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO tasks 
            (project_id, title, description, assigned_to, priority, deadline) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                projectId,
                title,
                description,
                assigned_to || null,
                priority || 'medium',
                deadline || null
            ]
        );

        await logActivity(userId, projectId, `Created task: ${title}`);

        res.status(201).json({
            message: 'Task created successfully',
            taskId: result.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const getTasks = async (req, res) => {
    const projectId = req.params.id;

    try {
        const [rows] = await db.execute(
            `SELECT t.*, u.name as assigneeName, u.profile_image as assigneeImage 
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.project_id = ?`,
            [projectId]
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const updateTaskStatus = async (req, res) => {
    const taskId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;

    try {
        // Get project_id for logging
        const [[task]] = await db.execute('SELECT project_id, title FROM tasks WHERE id = ?', [taskId]);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await db.execute(
            'UPDATE tasks SET status = ? WHERE id = ?',
            [status, taskId]
        );

        await logActivity(userId, task.project_id, `Updated task status to ${status}: ${task.title}`);

        res.json({ message: 'Task status updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const updatePriority = async (req, res) => {
    const taskId = req.params.id;
    const { priority } = req.body;
    const userId = req.user.id;

    try {
        const [[task]] = await db.execute('SELECT project_id, title FROM tasks WHERE id = ?', [taskId]);

        await db.execute(
            'UPDATE tasks SET priority = ? WHERE id = ?',
            [priority, taskId]
        );

        if (task) await logActivity(userId, task.project_id, `Updated task priority to ${priority}: ${task.title}`);

        res.json({ message: 'Task priority updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const assignTask = async (req, res) => {
    const taskId = req.params.id;
    const { assigned_to } = req.body;
    const userId = req.user.id;

    try {
        const [[task]] = await db.execute('SELECT project_id, title FROM tasks WHERE id = ?', [taskId]);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Verify assignee is member
        const [memberRows] = await db.execute(
            'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
            [task.project_id, assigned_to]
        );

        if (memberRows.length === 0) {
            return res.status(400).json({ message: 'User is not a member of this project' });
        }

        const [[user]] = await db.execute('SELECT name FROM users WHERE id = ?', [assigned_to]);

        await db.execute(
            'UPDATE tasks SET assigned_to = ? WHERE id = ?',
            [assigned_to, taskId]
        );

        await logActivity(userId, task.project_id, `Assigned task "${task.title}" to ${user.name}`);

        res.json({ message: 'Task assigned successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const deleteTask = async (req, res) => {
    const taskId = req.params.id;
    const userId = req.user.id;

    try {
        const [[task]] = await db.execute('SELECT project_id, title FROM tasks WHERE id = ?', [taskId]);

        await db.execute(
            'DELETE FROM tasks WHERE id = ?',
            [taskId]
        );

        if (task) await logActivity(userId, task.project_id, `Deleted task: ${task.title}`);

        res.json({ message: 'Task deleted' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
    createTask,
    getTasks,
    updateTaskStatus,
    updatePriority,
    assignTask,
    deleteTask
};
