require('dotenv').config();
const db = require('./config/db');

const migrate = async () => {
    try {
        console.log("Starting migration...");

        // 1. Update Users Table Role ENUM
        console.log("Updating users role ENUM...");
        try {
            await db.execute(`
                ALTER TABLE users 
                MODIFY COLUMN role ENUM('admin', 'member', 'manager', 'tester') DEFAULT 'member'
            `);
            console.log("Users role updated successfully.");
        } catch (err) {
            console.log("Users role might already be updated or error:", err.message);
        }

        console.log("Migration finished.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
