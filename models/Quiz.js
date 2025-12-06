const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Quiz = sequelize.define('Quiz', {
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
    topic: {
        type: DataTypes.STRING,
        allowNull: false
    },
    questions: {
        type: DataTypes.JSON,
        allowNull: false,
        // Structure: [{ id: 1, question: "...", options: ["A", "B", "C", "D"], correct: 0 }]
    },
    timeLimit: {
        type: DataTypes.INTEGER, // in minutes
        defaultValue: 30,
        field: 'time_limit'
    },
    cutoffScore: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'cutoff_score'
    },
    closesAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'closes_at'
    },
    isManualStop: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_manual_stop'
    },
    status: {
        type: DataTypes.ENUM('draft', 'published', 'closed'),
        defaultValue: 'published'
    }
}, {
    tableName: 'quizzes',
    timestamps: true,
    underscored: true
});

module.exports = Quiz;
