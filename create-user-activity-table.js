const { sequelize } = require('./models');

async function createUserActivityTable() {
    try {
        console.log('Creating user_activity table...');

        // Check if table exists
        const [results] = await sequelize.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'user_activity'
        `);

        if (results.length > 0) {
            console.log('ℹ️  Table user_activity already exists');
            process.exit(0);
        }

        // Create the table
        await sequelize.query(`
            CREATE TABLE user_activity (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(30) NOT NULL UNIQUE,
                last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                socket_id VARCHAR(100) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_last_seen (last_seen_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
            COMMENT='Tracks user online status with 30-second update intervals'
        `);

        console.log('✅ Successfully created user_activity table');
        console.log('📊 Table structure:');
        console.log('   - id: Primary key');
        console.log('   - user_id: User reference (unique)');
        console.log('   - last_seen_at: Timestamp updated every 30 seconds');
        console.log('   - socket_id: WebSocket connection ID (optional)');
        console.log('   - created_at, updated_at: Standard timestamps');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating user_activity table:', error);
        process.exit(1);
    }
}

createUserActivityTable();
