const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Assignment = sequelize.define('Assignment', {
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
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'due_date'
    },
    maxScore: {
        type: DataTypes.INTEGER,
        defaultValue: 100,
        field: 'max_score'
    }
}, {
    tableName: 'assignments',
    timestamps: true,
    underscored: true
});

const Submission = sequelize.define('Submission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'assignment_id'
    },
    studentId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'student_id'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.STRING,
        field: 'file_url'
    },
    grade: {
        type: DataTypes.INTEGER
    },
    feedback: {
        type: DataTypes.TEXT
    },
    submittedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'submitted_at'
    }
}, {
    tableName: 'submissions',
    timestamps: true,
    underscored: true
});

module.exports = { Assignment, Submission };
