require('dotenv').config();
const db = require('./config/db');

const clearDb = async () => {
    try {
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.execute('TRUNCATE TABLE notifications');
        await db.execute('TRUNCATE TABLE attachments');
        await db.execute('TRUNCATE TABLE project_invitations');
        await db.execute('TRUNCATE TABLE task_status_history');
        await db.execute('TRUNCATE TABLE task_comments');
        await db.execute('TRUNCATE TABLE activity_logs');
        await db.execute('TRUNCATE TABLE messages');
        await db.execute('TRUNCATE TABLE tasks');
        await db.execute('TRUNCATE TABLE project_members');
        await db.execute('TRUNCATE TABLE projects');
        await db.execute('TRUNCATE TABLE users');
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database cleared.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

clearDb();
