const db = require('./config/db');

async function cleanupOrphanedData() {
    try {
        console.log("🔍 Checking for orphaned data...");

        // 1. Remove orphaned project_members (users no longer in users table)
        const [pmResult] = await db.execute(`
            DELETE FROM project_members 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${pmResult.affectedRows} orphaned project_members.`);

        // 2. Unassign tasks assigned to non-existent users
        const [taskResult] = await db.execute(`
            UPDATE tasks 
            SET assigned_to = NULL 
            WHERE assigned_to IS NOT NULL 
            AND assigned_to NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Unassigned ${taskResult.affectedRows} tasks from non-existent users.`);

        // 3. Remove orphaned activity_logs
        const [logResult] = await db.execute(`
            DELETE FROM activity_logs 
            WHERE user_id NOT IN (SELECT id FROM users)
        `);
        console.log(`✅ Removed ${logResult.affectedRows} orphaned activity_logs.`);

        // 4. Also check tasks that are assigned to users who are NOT members of that specific project anymore
        // (If the user was removed from a project but still exists in the system)
        const [pmTaskResult] = await db.execute(`
            UPDATE tasks t
            LEFT JOIN project_members pm ON t.project_id = pm.project_id AND t.assigned_to = pm.user_id
            SET t.assigned_to = NULL
            WHERE t.assigned_to IS NOT NULL
            AND pm.user_id IS NULL
        `);
        console.log(`✅ Unassigned ${pmTaskResult.affectedRows} tasks from users no longer in those specific projects.`);

        console.log("🚀 Cleanup complete.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
}

cleanupOrphanedData();
