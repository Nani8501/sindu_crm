const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'course_id'
    },
    professorId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'professor_id'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'scheduled_at'
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 60
    },
    meetingLink: {
        type: DataTypes.STRING,
        field: 'meeting_link'
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
        defaultValue: 'scheduled'
    }
}, {
    tableName: 'sessions',
    timestamps: true,
    underscored: true
});

module.exports = Session;
