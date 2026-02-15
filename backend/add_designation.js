const db = require('./config/db');

async function addDesignationColumn() {
    try {
        console.log("Checking for designation column...");
        const [columns] = await db.execute("SHOW COLUMNS FROM users LIKE 'designation'");

        if (columns.length === 0) {
            console.log("Adding designation column to users table...");
            await db.execute("ALTER TABLE users ADD COLUMN designation VARCHAR(100) DEFAULT 'Member'");
            console.log("Column 'designation' added successfully.");
        } else {
            console.log("Column 'designation' already exists.");
        }
        process.exit(0);
    } catch (error) {
        console.error("Error updating database:", error);
        process.exit(1);
    }
}

addDesignationColumn();
