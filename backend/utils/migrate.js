const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    console.log('Starting Auto-Migration...');
    
    try {
        const sqlPath = path.join(__dirname, '../../Data_base1.sql');
        
        if (!fs.existsSync(sqlPath)) {
            console.error('Migration file not found at:', sqlPath);
            return;
        }

        const rawSql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon, then strip comment lines from each statement
        // This fixes the bug where '-- USERS TABLE\nCREATE TABLE...' was being filtered out
        const statements = rawSql
            .split(';')
            .map(s => {
                return s.split('\n')
                    .filter(line => !line.trim().startsWith('--'))
                    .join('\n')
                    .trim();
            })
            .filter(s => s.length > 0);

        console.log('Starting migration from:', sqlPath);
        console.log('Found', statements.length, 'SQL statements to execute.');

        const connection = await db.getConnection();
        try {
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');
            console.log('Foreign key checks disabled.');

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
                
                try {
                    await connection.query(statement);
                    console.log('  OK [' + (i+1) + '/' + statements.length + '] Executed: ' + preview);
                } catch (err) {
                    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log('  SKIP [' + (i+1) + '/' + statements.length + '] Table already exists.');
                        continue;
                    }
                    console.warn('  WARN [' + (i+1) + '/' + statements.length + ']: ' + preview);
                    console.warn('       Error: ' + err.message);
                }
            }

            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('Foreign key checks re-enabled.');
        } finally {
            connection.release();
        }

        console.log('Migration process finished.');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

module.exports = runMigration;
