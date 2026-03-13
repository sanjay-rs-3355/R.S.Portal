const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    console.log('🚀 Starting Auto-Migration...');
    
    try {
        const sqlPath = path.join(__dirname, '../../Data_base1.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.error('❌ Migration file not found at:', sqlPath);
            return;
        }

        const rawSql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon, but handle multi-line statements
        const statements = rawSql
            .split(/;(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`Found ${statements.length} SQL statements to execute.`);

        const connection = await db.getConnection();
        try {
            // Disable foreign key checks during migration on this specific connection
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');

            for (let statement of statements) {
                // Clean up database-specific commands that might fail on Aiven's defaultdb
                if (statement.toUpperCase().startsWith('USE ') || 
                    statement.toUpperCase().startsWith('CREATE DATABASE ')) {
                    continue;
                }

                try {
                    await connection.query(statement);
                } catch (err) {
                    // If table already exists, we skip it
                    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                        continue;
                    }
                    console.warn(`⚠️ Warning executing statement: ${statement.substring(0, 50)}...`);
                    console.warn(`Error: ${err.message}`);
                }
            }

            // Re-enable foreign key checks
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } finally {
            connection.release();
        }

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

module.exports = runMigration;
