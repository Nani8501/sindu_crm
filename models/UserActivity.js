const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserActivity = sequelize.define('UserActivity', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'last_seen_at',
        comment: 'Timestamp of last activity (updated every 30 seconds)'
    },
    isOnline: {
        type: DataTypes.VIRTUAL,
        get() {
            const lastSeen = this.getDataValue('lastSeenAt');
            if (!lastSeen) return false;

            // Consider user online if last seen within 60 seconds (2x the update interval)
            const now = new Date();
            const diff = (now - new Date(lastSeen)) / 1000; // difference in seconds
            return diff < 60;
        }
    },
    socketId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'socket_id',
        comment: 'Current socket.io connection ID if connected'
    }
}, {
    tableName: 'user_activity',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            fields: ['user_id'],
            unique: true
        },
        {
            fields: ['last_seen_at']
        }
    ]
});

module.exports = UserActivity;
