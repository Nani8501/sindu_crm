const { sequelize, Quiz, QuizSubmission } = require('./models');

async function syncTables() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        console.log('Syncing Quiz model...');
        await Quiz.sync({ alter: true });

        console.log('Syncing QuizSubmission model...');
        await QuizSubmission.sync({ alter: true });

        console.log('Tables synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Sync error:', error);
        process.exit(1);
    }
}

syncTables();
