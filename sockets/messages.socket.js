const { User } = require('../models');

module.exports = (io) => {
    io.on('connection', (socket) => {
        // User is already authenticated via middleware attached in server.js
        // socket.user contains { id, name, role, ... }

        // Join user-specific room for personal notifications
        if (socket.user && socket.user.id) {
            const userRoom = `user_${socket.user.id}`;
            socket.join(userRoom);
            console.log(`✅ User ${socket.user.name} (${socket.user.id}) joined room: ${userRoom}`);
        }

        socket.on('disconnect', () => {
            // Room leave is automatic on disconnect
        });
    });
};
