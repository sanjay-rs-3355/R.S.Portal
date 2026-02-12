const db = require('../config/db');
// If you want activity logging later, uncomment this:
// const logActivity = require('../utils/activityLogger');

const createTask = async (req, res) => {
    const projectId = req.params.id;
    const { title, description, assigned_to, priority, deadline } = req.body;

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
            'SELECT * FROM tasks WHERE project_id = ?',
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

    try {
        await db.execute(
            'UPDATE tasks SET status = ? WHERE id = ?',
            [status, taskId]
        );

        res.json({ message: 'Task status updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const updatePriority = async (req, res) => {
    const taskId = req.params.id;
    const { priority } = req.body;

    try {
        await db.execute(
            'UPDATE tasks SET priority = ? WHERE id = ?',
            [priority, taskId]
        );

        res.json({ message: 'Task priority updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


const deleteTask = async (req, res) => {
    const taskId = req.params.id;

    try {
        await db.execute(
            'DELETE FROM tasks WHERE id = ?',
            [taskId]
        );

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
    deleteTask
};
