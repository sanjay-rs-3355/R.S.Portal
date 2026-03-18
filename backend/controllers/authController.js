// controllers/authController.js

const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logActivity = require('../utils/activityLogger');


// 1️⃣ REGISTER
exports.register = async (req, res, next) => {
    const { name, email, password, role, designation, profile_image_url } = req.body;
    const file = req.file;

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

        // Default role to 'member' if not specified or invalid
        const userRole = (role === 'admin' || role === 'member' || role === 'manager' || role === 'tester') ? role : 'member';

        // Profile Image Logic
        let profileImagePath = null;
        if (file) {
            profileImagePath = file.filename;
        } else if (profile_image_url) {
            profileImagePath = profile_image_url;
        }

        // Insert user
        await db.execute(
            'INSERT INTO users (name, email, password, role, designation, profile_image) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, userRole, designation || 'Member', profileImagePath]
        );

        res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
        next(error);
    }
};



// 2️⃣ LOGIN
exports.login = async (req, res, next) => {
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

        // Generate Token
        const token = jwt.sign(
            { id: user.id, name: user.name, role: user.role, email: user.email, designation: user.designation }, // Added email and designation to token
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Update last login
        await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Log activity
        await logActivity(user.id, null, "User logged in");

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, role: user.role }
        });

    } catch (error) {
        next(error);
    }
};
