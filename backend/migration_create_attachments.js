const db = require('./config/db');

async function createAttachmentsTable() {
    try {
        console.log("Checking for attachments table...");

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS attachments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(255) NOT NULL,
                file_size INT,
                file_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await db.execute(createTableQuery);
        console.log("Table 'attachments' created or already exists.");

        process.exit(0);
    } catch (error) {
        console.error("Error creating attachments table:", error);
        process.exit(1);
    }
}

createAttachmentsTable();
