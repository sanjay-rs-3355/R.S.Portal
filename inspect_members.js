const db = require('./backend/config/db');
const check = async () => {
    try {
        const [rows] = await db.query("SELECT * FROM project_members LIMIT 10");
        console.table(rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
check();
