const { User } = require('./models');

async function updateAIAssistantName() {
    try {
        const aiUser = await User.findOne({ where: { id: 'ai-assistant' } });

        if (aiUser) {
            await aiUser.update({
                name: 'Study Buddy',
                bio: 'I am Study Buddy, your CRM AI Assistant.'
            });
            console.log('✅ Updated AI Assistant name to "Study Buddy"');
        } else {
            console.log('❌ AI Assistant user not found');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error updating AI Assistant:', error);
        process.exit(1);
    }
}

updateAIAssistantName();
