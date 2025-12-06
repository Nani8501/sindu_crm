/**
 * Database Migration Script for Online Classroom System
 * 
 * This script creates the necessary tables for the classroom system:
 * - classrooms
 * - classroom_participants
 * - Updates attendance table with classroomId column
 * 
 * Run this script once to set up the database tables.
 */

const { sequelize } = require('./models');
const Classroom = require('./models/Classroom');
const ClassroomParticipant = require('./models/ClassroomParticipant');
const Attendance = require('./models/Attendance');

async function runMigration() {
    try {
        console.log('🔄 Starting database migration for classroom system...\n');

        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully.\n');

        // Create classrooms table
        console.log('📋 Creating classrooms table...');
        await Classroom.sync({ alter: true });
        console.log('✅ Classrooms table created/updated.\n');

        // Create classroom_participants table
        console.log('📋 Creating classroom_participants table...');
        await ClassroomParticipant.sync({ alter: true });
        console.log('✅ Classroom participants table created/updated.\n');

        // Update attendance table (add classroomId column if it doesn't exist)
        console.log('📋 Updating attendance table...');
        await Attendance.sync({ alter: true });
        console.log('✅ Attendance table updated.\n');

        console.log('🎉 Database migration completed successfully!');
        console.log('\nThe following tables are now ready:');
        console.log('  - classrooms');
        console.log('  - classroom_participants');
        console.log('  - attendance (updated with classroomId column)');
        console.log('\n✨ You can now start the server with: npm start\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('\nError details:', error.message);
        process.exit(1);
    }
}

// Run migration
runMigration();
