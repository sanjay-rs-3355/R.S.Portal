const db = require('./config/db');

async function updateSnippetsTable() {
    try {
        console.log("Updating code_snippets table...");

        const addColumnsQuery = `
            ALTER TABLE code_snippets 
            ADD COLUMN IF NOT EXISTS filename VARCHAR(255) AFTER title,
            ADD COLUMN IF NOT EXISTS language VARCHAR(50) AFTER filename;
        `;

        // Note: MySQL 8.0.19+ supports ADD COLUMN IF NOT EXISTS, 
        // but for older versions we might need to check if columns exist or just try and catch.
        // Let's use a more compatible approach if needed, but I'll try this first.

        try {
            await db.execute("ALTER TABLE code_snippets ADD COLUMN filename VARCHAR(255) AFTER title");
            console.log("Added 'filename' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("'filename' column already exists.");
            } else {
                throw e;
            }
        }

        try {
            await db.execute("ALTER TABLE code_snippets ADD COLUMN language VARCHAR(50) AFTER filename");
            console.log("Added 'language' column.");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("'language' column already exists.");
            } else {
                throw e;
            }
        }

        console.log("Database update completed.");
        process.exit(0);
    } catch (error) {
        console.error("Error updating code_snippets table:", error);
        process.exit(1);
    }
}

updateSnippetsTable();
