const db = require('d:/web-collab-portal/backend/config/db');
async function fixSchema() {
    try {
        console.log("Altering tasks table...");
        await db.execute("ALTER TABLE tasks MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'review') DEFAULT 'pending'");
        console.log("Success!");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixSchema();
