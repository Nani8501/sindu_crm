// Migration script - alter all columns while FK checks are off
const { sequelize } = require('./models');

async function fixIdColumn() {
    try {
        console.log('Starting migration to fix users.id column...\n');

        // Disable foreign key checks
        console.log('Disabling foreign key checks...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('✓ FK checks disabled\n');

        console.log('Altering all ID-related columns to VARCHAR(30)...\n');

        // Alter users table first
        await sequelize.query('ALTER TABLE users MODIFY COLUMN id VARCHAR(30) NOT NULL');
        console.log('✓ users.id');

        // Alter all foreign key columns BEFORE re-enabling checks
        await sequelize.query('ALTER TABLE courses MODIFY COLUMN professor_id VARCHAR(30)');
        console.log('✓ courses.professor_id');

        await sequelize.query('ALTER TABLE sessions MODIFY COLUMN professor_id VARCHAR(30)');
        console.log('✓ sessions.professor_id');

        await sequelize.query('ALTER TABLE messages MODIFY COLUMN sender_id VARCHAR(30)');
        console.log('✓ messages.sender_id');

        await sequelize.query('ALTER TABLE messages MODIFY COLUMN receiver_id VARCHAR(30)');
        console.log('✓ messages.receiver_id');

        await sequelize.query('ALTER TABLE course_enrollments MODIFY COLUMN student_id VARCHAR(30)');
        console.log('✓ course_enrollments.student_id');

        console.log('\nRe-enabling foreign key checks...');
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✓ FK checks enabled\n');

        console.log('✅ Migration completed successfully!\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed at:', error.message);
        console.error('\nAttempting to re-enable FK checks...');
        try {
            await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
            console.log('✓ FK checks re-enabled\n');
        } catch (e) {
            console.error('Could not re-enable FK checks\n');
        }
        process.exit(1);
    }
}

fixIdColumn();
