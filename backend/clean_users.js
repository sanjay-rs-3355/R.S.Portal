require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');

const cleanUsers = async () => {
    try {
        const targetEmail = 'sanjay@gmail.com';

        console.log(`🧹 Cleaning users except ${targetEmail}...`);

        // 1. Check if Sanjay exists
        const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [targetEmail]);

        let sanjayId;

        if (rows.length === 0) {
            console.log("User 'Sanjay' not found. Creating...");
            const password = await bcrypt.hash('123456', 10);
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
                ['Sanjay', targetEmail, password, 'admin', 'active']
            );
            sanjayId = result.insertId;
            console.log(`Created user Sanjay (ID: ${sanjayId})`);
        } else {
            sanjayId = rows[0].id;
            console.log(`User Sanjay exists (ID: ${sanjayId}). Ensuring Admin role...`);
            await db.execute("UPDATE users SET role = 'admin' WHERE id = ?", [sanjayId]);
        }

        // 2. Delete everyone else
        const [deleteResult] = await db.execute('DELETE FROM users WHERE id != ?', [sanjayId]);
        console.log(`Deleted ${deleteResult.affectedRows} other users.`);

        // 3. Clean up orphaned data (optional but good practice)
        // Projects created by deleted users -> Set to Sanjay
        await db.execute('UPDATE projects SET created_by = ? WHERE created_by IS NULL', [sanjayId]);

        // Tasks assigned to deleted users -> Assign to Sanjay or Unassign?
        // Let's assign to Sanjay so the dashboard isn't empty
        await db.execute('UPDATE tasks SET assigned_to = ? WHERE assigned_to IS NULL', [sanjayId]);

        console.log("✅ Cleanup complete.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
        process.exit(1);
    }
};

cleanUsers();
