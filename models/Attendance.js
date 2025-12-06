const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    studentId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'student_id'
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id'
        },
        field: 'course_id'
    },
    sessionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'sessions',
            key: 'id'
        },
        field: 'session_id'
    },
    classroomId: {
        type: DataTypes.STRING(30),
        allowNull: true,
        references: {
            model: 'classrooms',
            key: 'id'
        },
        field: 'classroom_id',
        comment: 'Link to online classroom session (if attendance from live class)'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
        defaultValue: 'present'
    },
    markedBy: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        field: 'marked_by'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
    }
}, {
    tableName: 'attendance',
    timestamps: true,
    underscored: true
});

// Associations
Attendance.associate = function (models) {
    Attendance.belongsTo(models.User, {
        foreignKey: 'studentId',
        as: 'student'
    });
    Attendance.belongsTo(models.Course, {
        foreignKey: 'courseId',
        as: 'course'
    });
    Attendance.belongsTo(models.Session, {
        foreignKey: 'sessionId',
        as: 'session'
    });
    Attendance.belongsTo(models.User, {
        foreignKey: 'markedBy',
        as: 'marker'
    });
};

module.exports = Attendance;
