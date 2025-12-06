const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuizSubmission = sequelize.define('QuizSubmission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    quizId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'quiz_id'
    },
    studentId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'student_id'
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'total_questions'
    },
    answers: {
        type: DataTypes.JSON,
        allowNull: false,
        // Structure: { "1": 0, "2": 3 } // questionId: optionIndex
    },
    submittedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'submitted_at'
    }
}, {
    tableName: 'quiz_submissions',
    timestamps: true,
    underscored: true
});

module.exports = QuizSubmission;
