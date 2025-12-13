const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    senderId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'sender_id'
    },
    receiverId: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: 'receiver_id'
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for migration compatibility, but should be populated
        field: 'conversation_id'
    },
    attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'attachment_url'
    },
    attachmentType: {
        type: DataTypes.STRING, // 'image', 'document', etc.
        allowNull: true,
        field: 'attachment_type'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read'
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'read_at'
    },
    deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'delivered_at'
    },
    isStarred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_starred'
    },
    reactions: {
        type: DataTypes.JSON, // Stores { "userId": "emoji" }
        defaultValue: {},
        allowNull: true // Changed to allow null to be safe, though empty obj is default
    },
    replyToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'reply_to_id'
    }
}, {
    tableName: 'messages',
    timestamps: true,
    underscored: true
});

module.exports = Message;
