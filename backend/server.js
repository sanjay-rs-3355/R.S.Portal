require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Import socket logic
require('./sockets/chatSocket')(io);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api', require('./routes/memberRoutes'));
app.use('/api', require('./routes/taskRoutes'));
app.use('/api', require('./routes/dashboardRoutes'));
app.use('/api', require('./routes/userRoutes'));
app.use('/api', require('./routes/messageRoutes'));

server.listen(5000, () => {
    console.log('Server running on port 5000');
});
app.get('/', (req, res) => {
    res.send('Collaboration Portal Backend Running 🚀');
});
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

