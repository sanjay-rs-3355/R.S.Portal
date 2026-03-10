const db = require('./backend/config/db');
const update = async () => {
    try {
        await db.execute("ALTER TABLE code_snippets ADD COLUMN filename VARCHAR(255) AFTER title");
        console.log("Added filename");
        await db.execute("ALTER TABLE code_snippets ADD COLUMN language VARCHAR(50) AFTER filename");
        console.log("Added language");
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
};
update();
