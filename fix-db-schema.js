
const { sequelize } = require('./models');

async function fixSchema() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        console.log('Checking columns...');

        // Check if delivered_at exists
        try {
            await sequelize.query("SELECT delivered_at FROM messages LIMIT 1");
            console.log('✅ delivered_at column already exists');
        } catch (e) {
            console.log('Adding delivered_at column...');
            await sequelize.query("ALTER TABLE messages ADD COLUMN delivered_at DATETIME NULL");
            console.log('✅ delivered_at column added');
        }

        // Check if reactions exists
        try {
            await sequelize.query("SELECT reactions FROM messages LIMIT 1");
            console.log('✅ reactions column already exists');
        } catch (e) {
            console.log('Adding reactions column...');
            await sequelize.query("ALTER TABLE messages ADD COLUMN reactions JSON DEFAULT NULL");
            console.log('✅ reactions column added');
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Schema update failed:', error);
        process.exit(1);
    }
}

fixSchema();
