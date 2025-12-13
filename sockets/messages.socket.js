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
        socket.on('typing', ({ conversationId, receiverId }) => {
            if (receiverId) {
                io.to(`user_${receiverId}`).emit('typing', { conversationId, senderId: socket.user.id });
            }
        });

        socket.on('stop_typing', ({ conversationId, receiverId }) => {
            if (receiverId) {
                io.to(`user_${receiverId}`).emit('stop_typing', { conversationId, senderId: socket.user.id });
            }
        });

        socket.on('message_delivered', async ({ messageId, senderId, conversationId }) => {
            try {
                const { Message } = require('../models');
                await Message.update({ deliveredAt: new Date() }, { where: { id: messageId } });

                if (senderId) {
                    io.to(`user_${senderId}`).emit('message_delivered', { messageId, conversationId, deliveryTime: new Date() });
                }
            } catch (error) {
                console.error('Error marking message delivered:', error);
            }
        });

        socket.on('message_read', async ({ messageId, senderId, conversationId }) => {
            // Update DB
            try {
                const { Message } = require('../models');
                await Message.update({ isRead: true, readAt: new Date() }, { where: { id: messageId } });

                // Notify sender
                if (senderId) {
                    io.to(`user_${senderId}`).emit('message_read', { messageId, conversationId, readerId: socket.user.id });
                }
            } catch (error) {
                console.error('Error marking message read:', error);
            }
        });
    });
};
