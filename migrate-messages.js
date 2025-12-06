const { sequelize, User, Message, Conversation, ConversationParticipant } = require('./models');
const { Op } = require('sequelize');

async function migrateMessages() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        // Find all messages without conversationId
        const messages = await Message.findAll({
            where: {
                conversationId: null
            }
        });

        console.log(`Found ${messages.length} messages to migrate.`);

        for (const msg of messages) {
            const senderId = msg.senderId;
            const receiverId = msg.receiverId;

            if (!senderId || !receiverId) continue;

            // Check if conversation exists
            // We need to find a direct conversation between these two users
            // This query is a bit complex in Sequelize, so we'll do it in steps or raw query
            // For simplicity, let's check if we already created one in this script run or DB

            // Find all conversations where sender is a participant
            const senderConversations = await ConversationParticipant.findAll({
                where: { userId: senderId },
                include: [{
                    model: Conversation,
                    where: { type: 'direct' }
                }]
            });

            let conversation = null;

            for (const p of senderConversations) {
                const convId = p.conversationId;
                // Check if receiver is also in this conversation
                const receiverParticipant = await ConversationParticipant.findOne({
                    where: {
                        conversationId: convId,
                        userId: receiverId
                    }
                });

                if (receiverParticipant) {
                    conversation = p.Conversation;
                    break;
                }
            }

            if (!conversation) {
                // Create new conversation
                conversation = await Conversation.create({
                    type: 'direct'
                });

                await ConversationParticipant.bulkCreate([
                    { conversationId: conversation.id, userId: senderId },
                    { conversationId: conversation.id, userId: receiverId }
                ]);

                console.log(`Created new conversation ${conversation.id} for ${senderId} and ${receiverId}`);
            }

            // Update message
            msg.conversationId = conversation.id;
            await msg.save();
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateMessages();
