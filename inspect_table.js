const db = require('./backend/config/db');
const check = async () => {
    try {
        const [rows] = await db.query("SHOW COLUMNS FROM code_snippets");
        console.log("FIELDS:", rows.map(r => r.Field).join(", "));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
check();
