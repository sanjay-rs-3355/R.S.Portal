// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Sanjay33',
    database: process.env.DB_NAME || 'collaboration_portal',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 20, // Increased for stability
    queueLimit: 0,
    connectTimeout: 10000, // 10 seconds timeout for wake-up
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = db;


