const mysql = require('mysql2/promise');

async function listUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Sanjay33',
        database: 'collaboration_portal'
    });

    try {
        const [rows] = await connection.execute('SELECT id, name, email, role FROM users');
        console.log(JSON.stringify(rows, null, 2));
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await connection.end();
    }
}

listUsers();
