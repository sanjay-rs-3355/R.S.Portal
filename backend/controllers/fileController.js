const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const logActivity = require('../utils/activityLogger');

const uploadFile = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { title, description } = req.body;
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const [result] = await db.execute(
            "INSERT INTO attachments (project_id, user_id, title, description, filename, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                projectId,
                userId,
                title || file.originalname,
                description || null,
                file.originalname,
                file.filename,
                file.size,
                file.mimetype
            ]
        );

        await logActivity(userId, projectId, `📁 File "${file.originalname}" uploaded`, 'file');

        res.status(201).json({
            message: "File uploaded successfully",
            fileId: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

const getFilesByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const [files] = await db.execute(`
            SELECT a.*, u.name as user_name, u.profile_image 
            FROM attachments a
            JOIN users u ON a.user_id = u.id
            WHERE a.project_id = ?
            ORDER BY a.created_at DESC
        `, [projectId]);

        res.json(files);

    } catch (error) {
        next(error);
    }
};

const downloadFile = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [[file]] = await db.execute("SELECT * FROM attachments WHERE id = ?", [id]);

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        const filePath = path.join(__dirname, '../uploads', file.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found on server" });
        }

        res.download(filePath, file.filename);

    } catch (error) {
        next(error);
    }
};

const deleteFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const [[file]] = await db.execute("SELECT * FROM attachments WHERE id = ?", [id]);

        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        // Only creator or admin can delete
        if (file.user_id != userId && userRole !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to delete this file" });
        }

        // Delete from disk
        const filePath = path.join(__dirname, '../uploads', file.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await db.execute("DELETE FROM attachments WHERE id = ?", [id]);
        res.json({ message: "File deleted successfully" });

    } catch (error) {
        next(error);
    }
};

const getFileComments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT c.*, u.name as user_name, u.profile_image 
            FROM attachment_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.attachment_id = ?
            ORDER BY c.created_at ASC
        `, [id]);
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

const addFileComment = async (req, res, next) => {
    try {
        const { id } = req.params; // attachment_id
        const { content } = req.body;
        const userId = req.user.id;

        if (!content) {
            return res.status(400).json({ message: "Comment content is required." });
        }

        // Fetch project_id for logging
        const [[attachment]] = await db.execute("SELECT project_id, filename FROM attachments WHERE id = ?", [id]);
        if (!attachment) {
            return res.status(404).json({ message: "File not found" });
        }

        await db.execute(
            "INSERT INTO attachment_comments (attachment_id, user_id, content) VALUES (?, ?, ?)",
            [id, userId, content]
        );

        await logActivity(userId, attachment.project_id, `💬 Commented on file "${attachment.filename}"`, 'file');

        res.status(201).json({ message: "Comment added successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadFile,
    getFilesByProject,
    downloadFile,
    deleteFile,
    getFileComments,
    addFileComment
};
