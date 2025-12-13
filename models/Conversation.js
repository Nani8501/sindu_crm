const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.ENUM('direct', 'group', 'ai_chat'),
        defaultValue: 'direct'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true // Only for group chats
    },
    createdBy: {
        type: DataTypes.STRING, // User ID of creator
        allowNull: true // Only for group chats
    },
    iconUrl: {
        type: DataTypes.STRING,
        allowNull: true // Optional group icon
    },
    lastMessageAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'conversations',
    timestamps: true,
    underscored: true
});

module.exports = Conversation;
