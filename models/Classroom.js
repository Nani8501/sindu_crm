const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Classroom = sequelize.define('Classroom', {
    id: {
        type: DataTypes.STRING(30),
        primaryKey: true,
        // Format: CL-YYYYMMDD-XXXXX
        comment: 'Unique classroom identifier'
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Optional link to course (can be standalone classroom)',
        references: {
            model: 'courses',
            key: 'id'
        }
    },
    teacherId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Teacher/host user ID'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Classroom session title'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Session description or agenda'
    },
    scheduledStart: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the class is scheduled to start'
    },
    scheduledEnd: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the class is scheduled to end'
    },
    actualStart: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When teacher actually started the class'
    },
    actualEnd: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When teacher actually ended the class'
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
        defaultValue: 'scheduled',
        comment: 'Current classroom status'
    },
    maxStudents: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
        comment: 'Maximum number of students allowed'
    },
    recordingEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether class recording is enabled'
    },
    recordingUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to recorded session (if recorded)'
    },
    // Runtime data (not stored in DB, used in memory)
    mediasoupRouterId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Mediasoup router ID (runtime only)'
    },
    settings: {
        type: DataTypes.JSON,
        defaultValue: {
            allowStudentMic: true,
            allowStudentCamera: true,
            allowStudentScreenShare: true,
            requireApprovalForMic: true,
            requireApprovalForCamera: true,
            requireApprovalForScreenShare: true,
            allowChat: true,
            allowRaiseHand: true
        },
        comment: 'Classroom permission settings'
    }
}, {
    tableName: 'classrooms',
    timestamps: true
});

module.exports = Classroom;
