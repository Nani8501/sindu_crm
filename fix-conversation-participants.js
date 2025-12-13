const { sequelize } = require('./models');

async function addAddedByColumn() {
    try {
        console.log('Adding added_by column to conversation_participants table...');

        // Check if column exists
        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'conversation_participants' 
            AND COLUMN_NAME = 'added_by'
        `);

        if (results.length > 0) {
            console.log('Column added_by already exists!');
            process.exit(0);
        }

        // Add the column
        await sequelize.query(`
            ALTER TABLE conversation_participants 
            ADD COLUMN added_by VARCHAR(30) NULL AFTER user_id
        `);

        console.log('✅ Successfully added added_by column to conversation_participants table');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding column:', error);
        process.exit(1);
    }
}

addAddedByColumn();
