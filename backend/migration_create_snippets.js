const db = require('./config/db');

async function createSnippetsTable() {
    try {
        console.log("Checking for code_snippets table...");

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS code_snippets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                code TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        await db.execute(createTableQuery);
        console.log("Table 'code_snippets' created or already exists.");

        process.exit(0);
    } catch (error) {
        console.error("Error creating code_snippets table:", error);
        process.exit(1);
    }
}

createSnippetsTable();
