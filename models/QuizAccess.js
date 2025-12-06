const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuizAccess = sequelize.define('QuizAccess', {
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
    accessToken: {
        type: DataTypes.STRING(8),
        allowNull: false,
        unique: true,
        field: 'access_token'
    }
}, {
    tableName: 'quiz_access',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['quiz_id', 'student_id']
        },
        {
            unique: true,
            fields: ['access_token']
        }
    ]
});

module.exports = QuizAccess;
