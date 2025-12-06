const { sequelize, Conversation, ConversationParticipant, User } = require('./models');
const { Op } = require('sequelize');

async function migrateAIChat() {
    try {
        console.log('Starting AI Chat migration...');

        // 1. Find all users
        const users = await User.findAll({ attributes: ['id', 'name'] });
        console.log(`Checking ${users.length} users...`);

        let migratedCount = 0;

        for (const user of users) {
            if (user.id === 'ai-assistant') continue;

            // Find direct conversation between this user and ai-assistant
            // We need to find a conversation where BOTH are participants

            // Get user's conversations
            const userConvs = await ConversationParticipant.findAll({
                where: { userId: user.id },
                attributes: ['conversationId']
            });

            const convIds = userConvs.map(c => c.conversationId);

            if (convIds.length === 0) continue;

            // Find which of these also has ai-assistant
            const aiParticipant = await ConversationParticipant.findOne({
                where: {
                    userId: 'ai-assistant',
                    conversationId: { [Op.in]: convIds }
                }
            });

            if (aiParticipant) {
                const conversationId = aiParticipant.conversationId;
                const conversation = await Conversation.findByPk(conversationId);

                if (conversation && conversation.type === 'direct') {
                    console.log(`Migrating conversation ${conversationId} for user ${user.name} (${user.id})...`);

                    // Update type to ai_chat and give it a name
                    conversation.type = 'ai_chat';
                    conversation.name = 'Legacy Chat History';
                    await conversation.save();
                    migratedCount++;
                }
            }
        }

        console.log(`✅ Migration complete. Migrated ${migratedCount} conversations.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrateAIChat();
