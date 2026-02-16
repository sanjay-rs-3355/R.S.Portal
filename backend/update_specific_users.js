require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');

const usersToUpdate = [
    { name: 'Sanjay', email: 'sanjay@test.com', role: 'admin', designation: 'Admin' },
    { name: 'Thilak', email: 'thilak@test.com', role: 'manager', designation: 'Manager' },
    { name: 'Mohan', email: 'mohan@test.com', role: 'tester', designation: 'Tester' },
    { name: 'Sukesh', email: 'sukesh@test.com', role: 'tester', designation: 'Tester' },
    { name: 'Naresh', email: 'naresh@test.com', role: 'member', designation: 'Designer' },
    { name: 'Ahill', email: 'ahill@test.com', role: 'member', designation: 'Designer' },
    { name: 'Sudhir', email: 'sudhir@test.com', role: 'member', designation: 'Designer' }
];

async function updateUsers() {
    try {
        console.log("🚀 Starting user updates...");
        const password = await bcrypt.hash('123456', 10);

        for (const u of usersToUpdate) {
            // Check if user exists by name (flexible check)
            const [rows] = await db.execute('SELECT * FROM users WHERE name LIKE ?', [`%${u.name}%`]);

            if (rows.length > 0) {
                const user = rows[0];
                console.log(`Updating existing user: ${user.name} -> Role: ${u.role}, Designation: ${u.designation}`);
                await db.execute(
                    'UPDATE users SET role = ?, designation = ? WHERE id = ?',
                    [u.role, u.designation, user.id]
                );
            } else {
                console.log(`Creating new user: ${u.name} -> Role: ${u.role}, Designation: ${u.designation}`);
                await db.execute(
                    'INSERT INTO users (name, email, password, role, designation, status) VALUES (?, ?, ?, ?, ?, ?)',
                    [u.name, u.email, password, u.role, u.designation, 'active']
                );
            }
        }

        console.log("✅ All users updated successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating users:", error);
        process.exit(1);
    }
}

updateUsers();
