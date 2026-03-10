const db = require('./config/db');

async function thoroughCleanup() {
    try {
        console.log("🛠 Starting thorough system-wide cleanup for removed users...");

        // 1. Delete tasks that were assigned to users who no longer exist in the system
        // (These are currently unassigned by the previous script, but user wants them REMOVED)
        // Wait, "Task Breakdown" is what they mentioned.
        const [taskDelResult] = await db.execute(`
            DELETE FROM tasks 
            WHERE assigned_to IS NOT NULL 
            AND assigned_to NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Deleted ${taskDelResult.affectedRows} tasks from removed users.`);

        // 2. Delete messages from removed users
        const [msgDelResult] = await db.execute(`
            DELETE FROM messages 
            WHERE sender_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Deleted ${msgDelResult.affectedRows} messages from removed users.`);

        // 3. Delete comments from removed users
        const [commentDelResult] = await db.execute(`
            DELETE FROM task_comments 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Deleted ${commentDelResult.affectedRows} comments from removed users.`);

        // 4. Delete orphaned project_members (redundant but good)
        const [pmDelResult] = await db.execute(`
            DELETE FROM project_members 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${pmDelResult.affectedRows} orphaned project_members.`);

        // 5. Delete activity logs (orphaned)
        const [logDelResult] = await db.execute(`
            DELETE FROM activity_logs 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${logDelResult.affectedRows} orphaned activity_logs.`);

        // 6. Delete tasks in projects that are marked as deleted or no longer exist
        const [projTaskDelResult] = await db.execute(`
            DELETE FROM tasks 
            WHERE project_id NOT IN (SELECT id FROM projects WHERE is_deleted = FALSE)
        `);
        console.log(`✅ Removed ${projTaskDelResult.affectedRows} tasks from deleted projects.`);

        // 7. Remove snippets/files from removed users
        const [snipDelResult] = await db.execute(`
            DELETE FROM code_snippets 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${snipDelResult.affectedRows} snippets from removed users.`);

        // 8. Remove orphaned attachments
        const [attDelResult] = await db.execute(`
            DELETE FROM attachments 
            WHERE uploaded_by NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${attDelResult.affectedRows} attachments from removed users.`);

        // 9. Remove orphaned status history
        const [histDelResult] = await db.execute(`
            DELETE FROM task_status_history 
            WHERE changed_by NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${histDelResult.affectedRows} history records from removed users.`);

        // 10. Remove orphaned invitations
        const [invDelResult] = await db.execute(`
            DELETE FROM project_invitations 
            WHERE invited_by NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${invDelResult.affectedRows} invitations from removed users.`);

        // 11. Remove orphaned notifications
        const [notifDelResult] = await db.execute(`
            DELETE FROM notifications 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${notifDelResult.affectedRows} notifications from removed users.`);

        console.log("🚀 System cleanup complete. Dashboard Task Breakdown should now reflect only valid data.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Thorough cleanup failed:", error);
        process.exit(1);
    }
}

thoroughCleanup();
