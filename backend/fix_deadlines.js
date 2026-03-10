require('dotenv').config();
const db = require('./config/db');

const fix = async () => {
    try {
        // Get all non-completed tasks
        const [tasks] = await db.execute(
            "SELECT id, title, status FROM tasks WHERE status != 'completed' ORDER BY id ASC"
        );

        console.log(`Found ${tasks.length} non-completed tasks to update.`);

        const today = new Date();

        // Spread deadlines across the next 1-30 days so the widget shows a nice variety
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            const daysAhead = (i % 30) + 1; // 1..30 days from today, cycling
            const deadline = new Date(today);
            deadline.setDate(today.getDate() + daysAhead);
            const dateStr = deadline.toISOString().slice(0, 10);

            await db.execute('UPDATE tasks SET deadline = ? WHERE id = ?', [dateStr, task.id]);
            console.log(`  ✔ Task "${task.title}" (id=${task.id}) → deadline: ${dateStr}`);
        }

        // Also give completed tasks past deadlines (clean up)
        const [completedTasks] = await db.execute(
            "SELECT id FROM tasks WHERE status = 'completed'"
        );
        for (const t of completedTasks) {
            const daysAgo = Math.floor(Math.random() * 30) + 1;
            const past = new Date(today);
            past.setDate(today.getDate() - daysAgo);
            await db.execute('UPDATE tasks SET deadline = ? WHERE id = ?', [past.toISOString().slice(0, 10), t.id]);
        }
        console.log(`  ✔ Updated ${completedTasks.length} completed tasks with past deadlines.`);

        console.log('\n✅ All deadlines updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

fix();
