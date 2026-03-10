const db = require('d:/web-collab-portal/backend/config/db');
async function removeUsers() {
    try {
        console.log("Searching for test users to remove...");
        // Get up to 50 users that look like seeded users (userN@example.com)
        const [rows] = await db.execute("SELECT id, email FROM users WHERE email LIKE 'user%@example.com' LIMIT 50");

        if (rows.length === 0) {
            console.log("No test users found to remove.");
            process.exit(0);
        }

        const ids = rows.map(r => r.id);
        console.log(`Removing ${ids.length} users:`, rows.map(r => r.email).join(', '));

        // Use IN clause to delete multiple
        const placeholders = ids.map(() => '?').join(',');
        await db.execute(`DELETE FROM users WHERE id IN (${placeholders})`, ids);

        console.log("Successfully removed 50 users!");
        process.exit(0);
    } catch (e) {
        console.error("Error removing users:", e);
        process.exit(1);
    }
}
removeUsers();
