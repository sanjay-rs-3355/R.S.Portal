const mysql = require('mysql2/promise');

async function swapUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Sanjay33',
        database: 'collaboration_portal',
        multipleStatements: true
    });

    const tablesToUpdate = [
        { table: 'projects', col: 'created_by' },
        { table: 'project_members', col: 'user_id' },
        { table: 'tasks', col: 'assigned_to' },
        { table: 'messages', col: 'sender_id' },
        { table: 'activity_logs', col: 'user_id' },
        { table: 'task_comments', col: 'user_id' },
        { table: 'project_invitations', col: 'invited_by' },
        { table: 'attachments', col: 'uploaded_by' },
        { table: 'notifications', col: 'user_id' },
        { table: 'task_status_history', col: 'changed_by' }
    ];

    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('FK Checks Disabled');

        // Step 1: Move Admin (1) -> 999
        await connection.execute('UPDATE users SET id = 999 WHERE id = 1');
        for (const t of tablesToUpdate) {
            await connection.execute(`UPDATE ${t.table} SET ${t.col} = 999 WHERE ${t.col} = 1`);
        }
        console.log('Moved Admin (1) -> 999');

        // Step 2: Move Sanjay (2) -> 1
        await connection.execute('UPDATE users SET id = 1 WHERE id = 2');
        for (const t of tablesToUpdate) {
            await connection.execute(`UPDATE ${t.table} SET ${t.col} = 1 WHERE ${t.col} = 2`);
        }
        console.log('Moved Sanjay (2) -> 1');

        // Step 3: Move Admin (999) -> 2
        await connection.execute('UPDATE users SET id = 2 WHERE id = 999');
        for (const t of tablesToUpdate) {
            await connection.execute(`UPDATE ${t.table} SET ${t.col} = 2 WHERE ${t.col} = 999`);
        }
        console.log('Moved Admin (999) -> 2');

        console.log('User ID swap completed successfully.');

    } catch (error) {
        console.error('Error swapping users:', error);
    } finally {
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.end();
    }
}

swapUsers();
