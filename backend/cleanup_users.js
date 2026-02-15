const mysql = require('mysql2/promise');

async function cleanupUsers() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Sanjay33',
        database: 'collaboration_portal'
    });

    try {
        // 1. Delete untargeted users
        const [result] = await connection.execute(
            "DELETE FROM users WHERE email NOT IN ('admin@test.com', 'sanjay@gmail.com')"
        );
        console.log(`Deleted ${result.affectedRows} users.`);

        // 2. Ensure admin has admin role (optional fix)
        await connection.execute(
            "UPDATE users SET role = 'admin' WHERE email = 'admin@test.com'"
        );
        console.log("Updated admin role.");

    } catch (error) {
        console.error('Error cleaning up users:', error);
    } finally {
        await connection.end();
    }
}

cleanupUsers();
