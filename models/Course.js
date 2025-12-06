const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    professorId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'professor_id'
    },
    duration: {
        type: DataTypes.STRING,
        defaultValue: '6 weeks'
    },
    syllabus: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    startDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'start_date'
    },
    endDate: {
        type: DataTypes.DATE,
        field: 'end_date'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    }
}, {
    tableName: 'courses',
    timestamps: true,
    underscored: true
});

module.exports = Course;
