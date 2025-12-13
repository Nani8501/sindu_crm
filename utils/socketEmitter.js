const { ConversationParticipant, Conversation } = require('../models');

/**
 * Emits a 'new_message' event to all participants of a conversation except the sender.
 * @param {Object} io - Socket.io instance
 * @param {Object} message - Message object (Sequelize model or plain object)
 * @param {string} senderName - Name of the sender
 * @param {string} senderId - ID of the sender
 */
async function emitNewMessage(io, message, senderName, senderId) {
    if (!io) return;

    try {
        const conversationId = message.conversationId;

        // Fetch participants and conversation details if needed
        const participants = await ConversationParticipant.findAll({
            where: { conversationId }
        });

        // Get conversation to send name (or default)
        const conversation = await Conversation.findByPk(conversationId);
        const conversationName = conversation ? conversation.name : 'Chat';

        participants.forEach(p => {
            // Don't notify sender
            if (p.userId !== senderId) {
                // Emit to user's personal room
                io.to(`user_${p.userId}`).emit('new_message', {
                    message: {
                        id: message.id,
                        content: message.content,
                        senderId: senderId,
                        senderName: senderName,
                        conversationId: conversationId,
                        conversationName: conversationName,
                        createdAt: message.createdAt
                    },
                    conversationId: conversationId
                });
                console.log(`📡 Socket event sent to user_${p.userId}`);
            }
        });
    } catch (error) {
        console.error('Error emitting new message socket event:', error);
    }
}

module.exports = { emitNewMessage };
