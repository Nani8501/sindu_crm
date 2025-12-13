const { sequelize } = require('./models');

async function addMissingColumns() {
    try {
        console.log('Adding missing columns to conversations table...');

        // Check and add created_by column
        const [createdByResults] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'conversations' 
            AND COLUMN_NAME = 'created_by'
        `);

        if (createdByResults.length === 0) {
            await sequelize.query(`
                ALTER TABLE conversations 
                ADD COLUMN created_by VARCHAR(30) NULL AFTER name
            `);
            console.log('✅ Added created_by column');
        } else {
            console.log('ℹ️  created_by column already exists');
        }

        // Check and add icon_url column
        const [iconUrlResults] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'conversations' 
            AND COLUMN_NAME = 'icon_url'
        `);

        if (iconUrlResults.length === 0) {
            await sequelize.query(`
                ALTER TABLE conversations 
                ADD COLUMN icon_url VARCHAR(255) NULL AFTER created_by
            `);
            console.log('✅ Added icon_url column');
        } else {
            console.log('ℹ️  icon_url column already exists');
        }

        console.log('✅ Database schema update complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding columns:', error);
        process.exit(1);
    }
}

addMissingColumns();
