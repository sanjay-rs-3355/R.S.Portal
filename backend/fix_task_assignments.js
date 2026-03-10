const db = require('./config/db');

async function fixAssignments() {
    try {
        console.log("🔄 Starting task re-assignment fix...");

        // 1. Get all projects
        const [projects] = await db.execute('SELECT id, title FROM projects');

        for (const project of projects) {
            console.log(`Processing project: ${project.title} (ID: ${project.id})`);

            // 2. Get members of this project
            const [members] = await db.execute(
                'SELECT user_id FROM project_members WHERE project_id = ?',
                [project.id]
            );

            if (members.length === 0) {
                console.log(`⚠️ Project ${project.title} has no members. Skipping.`);
                continue;
            }

            const memberIds = members.map(m => m.user_id);

            // 3. Find all tasks for this project
            const [tasks] = await db.execute(
                'SELECT id, title, assigned_to FROM tasks WHERE project_id = ?',
                [project.id]
            );

            for (const task of tasks) {
                // If unassigned OR assigned to someone NOT in the project (safety check)
                if (!task.assigned_to || !memberIds.includes(task.assigned_to)) {
                    const randomMemberId = memberIds[Math.floor(Math.random() * memberIds.length)];
                    await db.execute(
                        'UPDATE tasks SET assigned_to = ? WHERE id = ?',
                        [randomMemberId, task.id]
                    );
                    console.log(`✅ Assigned task "${task.title}" to User ID: ${randomMemberId}`);
                }
            }
        }

        console.log("✅ Task assignments synchronized with project members.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Fix failed:", err);
        process.exit(1);
    }
}

fixAssignments();
