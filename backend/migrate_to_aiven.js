require('dotenv').config();
const mysql = require('mysql2/promise');

const fs = require('fs');
const path = require('path');

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: {
            rejectUnauthorized: false
        }
    });



    console.log('Connected to Aiven MySQL');

    try {
        const sqlPath = 'd:/web-collab-portal/Data_base1.sql';
        const rawSql = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon, but handle multi-line statements and avoid empty strings
        // This is a simple split, might need refinement for complex SQL but should work for this file
        const statements = rawSql
            .split(/;(?=(?:[^'"]|'[^']*'|"[^"]*")*$)/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let statement of statements) {
            // Replace USE collaboration_portal with USE defaultdb
            if (statement.toUpperCase().startsWith('USE COLLABORATION_PORTAL')) {
                statement = 'USE defaultdb';
            }
            if (statement.toUpperCase().startsWith('CREATE DATABASE COLLABORATION_PORTAL')) {
                console.log('Skipping CREATE DATABASE...');
                continue;
            }

            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await connection.query(statement);
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
