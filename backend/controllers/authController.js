// controllers/authController.js

const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// 1️⃣ REGISTER
exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if email already exists
        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user (default role = member)
        await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};



// 2️⃣ LOGIN
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = users[0];

        // Check account status
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account suspended' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT
        const token = jwt.sign(
        {
                id: user.id,
                name: user.name,   // ADD THIS
                role: user.role
            },
                process.env.JWT_SECRET,
                { expiresIn: "2h" }
        );


        // Update last_login
        await db.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
    console.error("REAL ERROR:", error);
    res.status(500).json({ message: error.message });
}


};
