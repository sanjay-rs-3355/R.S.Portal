const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

// Create a new snippet
const createSnippet = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { title, description, code, filename, language } = req.body;
        const userId = req.user.id;

        console.log(`[CREATE SNIPPET] proj:${projectId} user:${userId} title:${title} codeSize:${code ? code.length : 0}`);

        if (!title || !code) {
            return res.status(400).json({ message: "Title and code are required." });
        }

        const [result] = await db.execute(
            "INSERT INTO code_snippets (project_id, user_id, title, description, code, filename, language) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [projectId, userId, title, description || null, code, filename || null, language || null]
        );

        await logActivity(userId, projectId, `📁 File "${filename || title}" uploaded`, 'file');

        res.status(201).json({
            message: "Snippet posted successfully",
            snippetId: result.insertId
        });

    } catch (error) {
        next(error);
    }
};

// Get snippets for a project
const getSnippetsByProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;

        const [snippets] = await db.execute(`
            SELECT s.*, u.name as user_name, u.profile_image 
            FROM code_snippets s
            JOIN users u ON s.user_id = u.id
            WHERE s.project_id = ?
            ORDER BY s.created_at DESC
        `, [projectId]);

        res.json(snippets);

    } catch (error) {
        next(error);
    }
};

// Delete a snippet
const deleteSnippet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Verify snippet exists
        const [[snippet]] = await db.execute("SELECT * FROM code_snippets WHERE id = ?", [id]);

        if (!snippet) {
            return res.status(404).json({ message: "Snippet not found" });
        }

        // Only creator or admin can delete
        if (snippet.user_id != userId && userRole !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to delete this snippet" });
        }

        await db.execute("DELETE FROM code_snippets WHERE id = ?", [id]);
        res.json({ message: "Snippet deleted successfully" });

    } catch (error) {
        next(error);
    }
};

// Update a snippet
const updateSnippet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, code, filename, language } = req.body;
        const userId = req.user.id;

        // Verify snippet exists
        const [[snippet]] = await db.execute("SELECT * FROM code_snippets WHERE id = ?", [id]);

        if (!snippet) {
            return res.status(404).json({ message: "Snippet not found" });
        }

        // To ensure user is part of the project
        const [[isMember]] = await db.execute("SELECT * FROM project_members WHERE project_id = ? AND user_id = ?", [snippet.project_id, userId]);
        if (!isMember && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized to edit this project's snippet" });
        }

        await db.execute(
            "UPDATE code_snippets SET title = ?, description = ?, code = ?, filename = ?, language = ? WHERE id = ?",
            [title || snippet.title, description || snippet.description, code || snippet.code, filename !== undefined ? filename : snippet.filename, language !== undefined ? language : snippet.language, id]
        );

        await logActivity(userId, snippet.project_id, `📁 File "${filename || snippet.filename || title || snippet.title}" edited`, 'file');

        res.json({ message: "Snippet updated successfully" });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createSnippet,
    getSnippetsByProject,
    deleteSnippet,
    updateSnippet
};
