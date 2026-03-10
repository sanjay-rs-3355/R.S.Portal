const db = require('../config/db');

/**
 * Get all records from a table with basic pagination and search
 */
exports.getTableData = async (req, res) => {
    try {
        const { tableName } = req.params;
        const { page = 1, limit = 10, search = '', sortBy = 'id', sortOrder = 'ASC' } = req.query;
        const offset = (page - 1) * limit;

        // Security check: only allow specific tables
        const allowedTables = ['users', 'projects', 'tasks', 'messages', 'code_snippets', 'meetings', 'notifications', 'activity_logs', 'project_members', 'attachments', 'meeting_participants', 'project_invitations', 'task_comments', 'task_status_history'];
        if (!allowedTables.includes(tableName)) {
            return res.status(403).json({ success: false, message: 'Access to this table is restricted.' });
        }

        // Get columns first to build search and validate sort
        const [columns] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
        const colNames = columns.map(c => c.Field);

        // Sanitize sortBy
        const activeSortBy = colNames.find(c => c.toLowerCase() === sortBy.toLowerCase()) || colNames[0] || 'id';
        const activeSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

        // Search logic
        let whereClause = '';
        let params = [];

        if (search) {
            const searchFields = columns
                .filter(col => col.Type.includes('char') || col.Type.includes('text'))
                .map(col => `${col.Field} LIKE ?`)
                .join(' OR ');

            if (searchFields) {
                whereClause = `WHERE ${searchFields}`;
                const searchParam = `%${search}%`;
                params = columns
                    .filter(col => col.Type.includes('char') || col.Type.includes('text'))
                    .map(() => searchParam);
            }
        }

        const countQuery = `SELECT COUNT(*) as total FROM ${tableName} ${whereClause}`;
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;

        const pageSize = parseInt(limit);
        const pageOffset = (parseInt(page) - 1) * pageSize;

        const dataQuery = `SELECT * FROM ${tableName} ${whereClause} ORDER BY \`${activeSortBy}\` ${activeSortOrder} LIMIT ? OFFSET ?`;
        const [rows] = await db.query(dataQuery, [...params, pageSize, pageOffset]);

        console.log(`Executed: SELECT * FROM ${tableName} ORDER BY ${activeSortBy} ${activeSortOrder}`);

        // Get column info for header rendering
        const [columnData] = await db.query(`SHOW COLUMNS FROM ${tableName}`);

        res.json({
            success: true,
            data: rows,
            columns: columnData,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Database Manager Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a record from any allowed table
 */
exports.deleteRecord = async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const allowedTables = ['users', 'projects', 'tasks', 'messages', 'code_snippets', 'meetings', 'notifications', 'activity_logs', 'project_members', 'attachments', 'meeting_participants', 'project_invitations', 'task_comments', 'task_status_history'];

        if (!allowedTables.includes(tableName)) {
            return res.status(403).json({ success: false, message: 'Access restricted.' });
        }

        await db.execute(`DELETE FROM ${tableName} WHERE id = ?`, [id]);

        res.json({ success: true, message: 'Record deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Generic create record
 */
exports.createRecord = async (req, res) => {
    try {
        const { tableName } = req.params;
        const data = req.body;

        const allowedTables = ['users', 'projects', 'tasks', 'messages', 'code_snippets', 'meetings', 'notifications', 'activity_logs', 'project_members', 'attachments', 'meeting_participants', 'project_invitations', 'task_comments', 'task_status_history'];
        if (!allowedTables.includes(tableName)) {
            return res.status(403).json({ success: false, message: 'Access restricted.' });
        }

        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
        const [result] = await db.execute(query, values);

        res.json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Generic update record
 */
exports.updateRecord = async (req, res) => {
    try {
        const { tableName, id } = req.params;
        const data = req.body;

        const allowedTables = ['users', 'projects', 'tasks', 'messages', 'code_snippets', 'meetings', 'notifications', 'activity_logs', 'project_members', 'attachments', 'meeting_participants', 'project_invitations', 'task_comments', 'task_status_history'];
        if (!allowedTables.includes(tableName)) {
            return res.status(403).json({ success: false, message: 'Access restricted.' });
        }

        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');

        const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
        await db.execute(query, [...values, id]);

        res.json({ success: true, message: 'Record updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
