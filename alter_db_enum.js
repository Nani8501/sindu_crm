const { sequelize } = require('./models');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Raw query to update the ENUM definition
        await sequelize.query(`
            ALTER TABLE conversations 
            MODIFY COLUMN type ENUM('direct', 'group', 'ai_chat') 
            DEFAULT 'direct';
        `);

        console.log('✅ Successfully updated ENUM type in conversations table.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
