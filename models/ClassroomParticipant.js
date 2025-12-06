const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClassroomParticipant = sequelize.define('ClassroomParticipant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    classroomId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        references: {
            model: 'classrooms',
            key: 'id'
        },
        comment: 'Classroom session ID'
    },
    userId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'User ID (student or teacher)'
    },
    role: {
        type: DataTypes.ENUM('teacher', 'student'),
        allowNull: false,
        comment: 'Role in this classroom session'
    },
    joinedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When user joined the session'
    },
    leftAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When user left the session'
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total duration in seconds'
    },
    isPresent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Currently in the classroom'
    },
    permissions: {
        type: DataTypes.JSON,
        defaultValue: {
            canSpeak: false,
            canVideo: false,
            canScreenShare: false,
            isRemoteControlled: false,
            isMutedByTeacher: false,
            isKicked: false
        },
        comment: 'Real-time permissions for this participant'
    },
    // Runtime connection data
    socketId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Socket.IO connection ID (runtime)'
    },
    producerIds: {
        type: DataTypes.JSON,
        defaultValue: {
            audio: null,
            video: null,
            screen: null
        },
        comment: 'Mediasoup producer IDs (runtime)'
    },
    transportIds: {
        type: DataTypes.JSON,
        defaultValue: {
            send: null,
            receive: null
        },
        comment: 'Mediasoup transport IDs (runtime)'
    }
}, {
    tableName: 'classroom_participants',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['classroomId', 'userId']
        }
    ]
});

module.exports = ClassroomParticipant;
