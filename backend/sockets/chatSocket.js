const jwt = require('jsonwebtoken');
const db = require('../config/db');
const logActivity = require('../utils/activityLogger');

module.exports = (io) => {

    // 🔴 PRESENCE TRACKING
    const projectPresence = {}; // { [projectId]: { [userId]: 'online'|'idle' } }
    const userProjectSockets = {}; // { [socketId]: { userId, projectId } }
    const idleTimeouts = {}; // { [userId]: { [projectId]: timeout } }

    const IDLE_TIME = 5 * 60 * 1000; // 5 mins

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Unauthorized"));
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            return next(new Error("Unauthorized"));
        }
    });

    const broadcastPresence = (projectId) => {
        const roomName = `project_${projectId}`;
        if (projectPresence[projectId]) {
            io.to(roomName).emit('teamPresence', projectPresence[projectId]);
        }
    };

    const setUserStatus = (userId, projectId, status) => {
        if (!projectId) return;
        if (!projectPresence[projectId]) projectPresence[projectId] = {};

        const current = projectPresence[projectId][userId];
        if (current !== status) {
            projectPresence[projectId][userId] = status;
            broadcastPresence(projectId);
        }

        // Reset idle timer
        if (idleTimeouts[userId] && idleTimeouts[userId][projectId]) {
            clearTimeout(idleTimeouts[userId][projectId]);
        }

        if (status === 'online') {
            if (!idleTimeouts[userId]) idleTimeouts[userId] = {};
            idleTimeouts[userId][projectId] = setTimeout(() => {
                setUserStatus(userId, projectId, 'idle');
            }, IDLE_TIME);
        }
    };

    io.on('connection', (socket) => {
        console.log("User connected:", socket.user.id);

        socket.on('joinProject', async (projectId) => {
            try {
                if (socket.user.role !== 'admin') {
                    const [rows] = await db.execute(
                        'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
                        [projectId, socket.user.id]
                    );
                    if (rows.length === 0) {
                        return socket.emit('errorMessage', 'Not a project member');
                    }
                }

                const roomName = `project_${projectId}`;
                socket.join(roomName);
                socket.projectId = projectId;
                userProjectSockets[socket.id] = { userId: socket.user.id, projectId };

                setUserStatus(socket.user.id, projectId, 'online');
                socket.emit('joinedProject', projectId);

            } catch (error) {
                console.error(error);
            }
        });

        // 🔵 Activity Heartbeat from UI
        socket.on('activity', () => {
            if (socket.projectId) {
                setUserStatus(socket.user.id, socket.projectId, 'online');
            }
        });

        socket.on('typing', () => {
            if (!socket.projectId) return;
            setUserStatus(socket.user.id, socket.projectId, 'online');
            socket.to(`project_${socket.projectId}`).emit('userTyping', socket.user.id);
        });

        socket.on('stopTyping', () => {
            if (!socket.projectId) return;
            socket.to(`project_${socket.projectId}`).emit('userStoppedTyping', socket.user.id);
        });

        socket.on('sendMessage', async ({ message, projectId: msgProjectId }) => {
            try {
                if (!message || message.trim() === "") return;
                const projectId = socket.projectId || msgProjectId;

                if (!projectId) return socket.emit('errorMessage', 'Join a project first');
                setUserStatus(socket.user.id, projectId, 'online');

                const [[userRow]] = await db.execute('SELECT name FROM users WHERE id = ?', [socket.user.id]);
                const userName = userRow ? userRow.name : 'User';

                const [result] = await db.execute(
                    'INSERT INTO messages (project_id, sender_id, message) VALUES (?, ?, ?)',
                    [projectId, socket.user.id, message]
                );

                const messageData = {
                    id: result.insertId,
                    projectId,
                    userId: socket.user.id,
                    userName,
                    userInitial: userName.charAt(0).toUpperCase(),
                    message,
                    timestamp: new Date()
                };

                await logActivity(socket.user.id, projectId, `💬 ${userName} sent a message`, 'chat');
                io.to(`project_${projectId}`).emit('receiveMessage', messageData);

            } catch (error) {
                console.error(error);
            }
        });

        socket.on('disconnect', () => {
            const data = userProjectSockets[socket.id];
            if (data) {
                const { userId, projectId } = data;
                delete userProjectSockets[socket.id];

                // Check if user has other sockets in this project
                const stillConnected = Object.values(userProjectSockets).some(
                    s => s.userId === userId && s.projectId === projectId
                );

                if (!stillConnected) {
                    if (idleTimeouts[userId] && idleTimeouts[userId][projectId]) {
                        clearTimeout(idleTimeouts[userId][projectId]);
                        delete idleTimeouts[userId][projectId];
                    }
                    if (projectPresence[projectId]) {
                        delete projectPresence[projectId][userId];
                        broadcastPresence(projectId);
                    }
                }
            }
            console.log("User disconnected:", socket.user.id);
        });
    });
};
