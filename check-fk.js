// Check existing foreign keys
const { sequelize } = require('./models');

async function checkForeignKeys() {
    try {
        console.log('Checking foreign key constraints...\n');

        const tables = ['courses', 'assignments', 'sessions', 'messages', 'course_enrollments'];

        for (const table of tables) {
            console.log(`\n${table.toUpperCase()}:`);
            const [results] = await sequelize.query(`
                SELECT 
                    CONSTRAINT_NAME,
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = '${table}'
                    AND REFERENCED_TABLE_NAME IS NOT NULL
            `);

            results.forEach(fk => {
                console.log(`  - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkForeignKeys();
