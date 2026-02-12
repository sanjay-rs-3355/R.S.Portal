// config/db.js

const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Sanjay33',
    database: 'collaboration_portal'
});

module.exports = db;

