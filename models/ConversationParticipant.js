const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationParticipant = sequelize.define('ConversationParticipant', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'conversation_id',
        references: {
            model: 'conversations',
            key: 'id'
        }
    },
    userId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    addedBy: {
        type: DataTypes.STRING(30),
        allowNull: true, // Creator adds initial members, null for self-join
        field: 'added_by'
    },
    joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'conversation_participants',
    timestamps: true,
    underscored: true
});

module.exports = ConversationParticipant;
