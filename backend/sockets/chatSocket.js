const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = (io) => {

    const onlineUsers = {};

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error("Unauthorized"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            return next(new Error("Unauthorized"));
        }
    });

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

                if (!onlineUsers[roomName]) {
                    onlineUsers[roomName] = new Set();
                }

                onlineUsers[roomName].add(socket.user.id);

                // Broadcast updated online users
                io.to(roomName).emit('onlineUsers', Array.from(onlineUsers[roomName]));

                socket.emit('joinedProject', projectId);

            } catch (error) {
                console.error(error);
            }
        });

        // 🔵 Typing indicator
        socket.on('typing', () => {
            if (!socket.projectId) return;

            socket.to(`project_${socket.projectId}`)
                .emit('userTyping', socket.user.id);
        });

        socket.on('stopTyping', () => {
            if (!socket.projectId) return;

            socket.to(`project_${socket.projectId}`)
                .emit('userStoppedTyping', socket.user.id);
        });

        // 💬 Send message
        socket.on('sendMessage', async ({ message }) => {

    try {

        if (!message || message.trim() === "") return;

        const projectId = socket.projectId;

        // 🚨 If user didn't join project
        if (!projectId) {
            return socket.emit('errorMessage', 'Join a project first');
        }

        if (socket.user.role !== 'admin') {
            const [rows] = await db.execute(
                'SELECT * FROM project_members WHERE project_id = ? AND user_id = ?',
                [projectId, socket.user.id]
            );

            if (rows.length === 0) {
                return socket.emit('errorMessage', 'Unauthorized');
            }
        }

        const [result] = await db.execute(
            'INSERT INTO messages (project_id, sender_id, message) VALUES (?, ?, ?)',
            [projectId, socket.user.id, message]
        );

        const messageData = {
            id: result.insertId,
            projectId,
            userId: socket.user.id,
            message,
            timestamp: new Date()
        };

        io.to(`project_${projectId}`).emit('receiveMessage', messageData);

    } catch (error) {
        console.error(error);
    }
});

        socket.on('disconnect', () => {

            if (socket.projectId) {
                const roomName = `project_${socket.projectId}`;

                if (onlineUsers[roomName]) {
                    onlineUsers[roomName].delete(socket.user.id);

                    io.to(roomName).emit(
                        'onlineUsers',
                        Array.from(onlineUsers[roomName])
                    );
                }
            }

            console.log("User disconnected:", socket.user.id);
        });
    });
};
