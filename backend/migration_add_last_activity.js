require('dotenv').config();
const db = require('./config/db');

const migrate = async () => {
    try {
        console.log("🚀 Starting Project Migration...");

        // 1. Add Columns to Projects
        console.log("Adding last_activity columns to projects table...");
        await db.execute(`
            ALTER TABLE projects 
            ADD COLUMN last_activity_text VARCHAR(255) DEFAULT NULL,
            ADD COLUMN last_activity_type ENUM('task', 'file', 'member', 'chat') DEFAULT NULL,
            ADD COLUMN last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `);

        // 2. Set an initial activity for existing projects (Optional, but good for UI consistency)
        console.log("Setting initial activity values for existing projects...");
        await db.execute(`
            UPDATE projects 
            SET last_activity_text = 'Project space ready',
                last_activity_type = 'member',
                last_activity_at = created_at
        `);

        console.log("✅ Project Table Migration Completed Successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    }
};

migrate();
