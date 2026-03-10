const db = require('d:/web-collab-portal/backend/config/db');
async function checkSchema() {
    try {
        const [rows] = await db.execute("SHOW COLUMNS FROM tasks LIKE 'priority'");
        console.log("PRIORITY_TYPE:", rows[0].Type);
        process.exit(0);
    } catch (e) {
        process.exit(1);
    }
}
checkSchema();
