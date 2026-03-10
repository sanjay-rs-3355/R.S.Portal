const db = require('d:/web-collab-portal/backend/config/db');
async function checkCount() {
    try {
        const [[res]] = await db.execute("SELECT COUNT(*) as count FROM users");
        console.log(`Total users remaining: ${res.count}`);
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
checkCount();
