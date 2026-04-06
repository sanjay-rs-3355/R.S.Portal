require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const helmet = require('helmet');
const fs = require('fs');
const runMigration = require('./utils/migrate');
const seedDatabase = require('./seed');


const app = express();
const passport = require('passport');
require('./config/passport')();

// ===== SECURITY =====
app.use(helmet({ contentSecurityPolicy: false }));
app.use(passport.initialize());

// ===== BODY PARSER =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Static Files (Move up so index.html is served first)
app.use(express.static(path.join(__dirname, '../frontend')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Import socket logic
require('./sockets/chatSocket')(io);

// 2. API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api', require('./routes/fileRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api', require('./routes/memberRoutes'));
app.use('/api', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', require('./routes/messageRoutes'));
app.use('/api', require('./routes/snippetRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 3. Root Fallback (only if static fails)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'), (err) => {
        if (err) {
            res.send('Collaboration Portal Backend Running 🚀');
        }
    });
});

// 4. Global Error Handler
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log to error file
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${status}: ${message}\n`;
    fs.appendFile(path.join(__dirname, 'error.log'), logLine, () => { });

    console.error(`[ERROR] ${req.method} ${req.originalUrl} =>`, message);
    res.status(status).json({ success: false, message });
});

// 5. Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    
    // Ensure uploads directory exists (Critical for Ephemeral environments like Render)
    const uploadsPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsPath)) {
        console.log(`[SYSTEM] Creating missing uploads directory at: ${uploadsPath}`);
        fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    // Auto-run database migration
    await runMigration();

    // Auto-seed demo data if database is empty
    await seedDatabase();

    if (process.env.NODE_ENV !== 'production') {
        console.log(`Access the portal at: http://localhost:${PORT}`);
    }
});


