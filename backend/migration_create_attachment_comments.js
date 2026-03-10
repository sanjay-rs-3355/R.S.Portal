const db = require('./config/db');

async function createAttachmentCommentsTable() {
    try {
        console.log("Checking for attachment_comments table...");

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS attachment_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                attachment_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (attachment_id) REFERENCES attachments(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await db.execute(createTableQuery);
        console.log("Table 'attachment_comments' created or already exists.");

        process.exit(0);
    } catch (error) {
        console.error("Error creating attachment_comments table:", error);
        process.exit(1);
    }
}

createAttachmentCommentsTable();
