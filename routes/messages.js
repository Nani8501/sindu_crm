const express = require('express');
const router = express.Router();
const { Message, User, Conversation, ConversationParticipant } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const aiService = require('../services/aiService');

// @route   GET /api/messages/ai/conversations
// @desc    Get all AI chat conversations for the current user
// @access  Private
router.get('/ai/conversations', protect, async (req, res) => {
    console.log('DEBUG: Hitting /api/messages/ai/conversations for user:', req.user.id);
    try {
        const conversations = await Conversation.findAll({
            where: {
                type: 'ai_chat'
            },
            include: [{
                model: ConversationParticipant,
                where: { userId: req.user.id }
            }],
            order: [['updatedAt', 'DESC']]
        });

        res.json({ success: true, conversations });
    } catch (error) {
        console.error('Get AI conversations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/messages/:id/star
// @desc    Toggle starred status of a message
// @access  Private
router.post('/:id/star', protect, async (req, res) => {
    try {
        const messageId = req.params.id;

        // Find the message
        const message = await Message.findByPk(messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        // Verify user is participant in the conversation
        const isParticipant = await ConversationParticipant.findOne({
            where: {
                conversationId: message.conversationId,
                userId: req.user.id
            }
        });

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Toggle starred status
        message.isStarred = !message.isStarred;
        await message.save();

        res.json({
            success: true,
            message: 'Message ' + (message.isStarred ? 'starred' : 'unstarred'),
            isStarred: message.isStarred
        });
    } catch (error) {
        console.error('Star message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/messages/ai/start
// @desc    Start a new AI conversation
// @access  Private
router.post('/ai/start', protect, async (req, res) => {
    try {
        const conversation = await Conversation.create({
            type: 'ai_chat',
            name: 'New Chat'
        });

        // Add user and AI assistant as participants
        await ConversationParticipant.bulkCreate([
            { conversationId: conversation.id, userId: req.user.id },
            { conversationId: conversation.id, userId: 'ai-assistant' }
        ]);

        res.json({ success: true, conversation });
    } catch (error) {
        console.error('Start AI conversation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/attachments/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        // Accept images and basic documents
        const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: File upload only supports images and documents!'));
    }
});

// Helper to find or create direct conversation
async function findOrCreateDirectConversation(userId1, userId2) {
    // Find conversations where user1 is a participant
    const user1Conversations = await ConversationParticipant.findAll({
        where: { userId: userId1 },
        include: [{
            model: Conversation,
            where: { type: 'direct' }
        }]
    });

    for (const p of user1Conversations) {
        const convId = p.conversationId;
        // Check if user2 is also in this conversation
        const user2Participant = await ConversationParticipant.findOne({
            where: {
                conversationId: convId,
                userId: userId2
            }
        });

        if (user2Participant) {
            return p.Conversation;
        }
    }

    // Create new conversation
    const conversation = await Conversation.create({ type: 'direct' });
    await ConversationParticipant.bulkCreate([
        { conversationId: conversation.id, userId: userId1 },
        { conversationId: conversation.id, userId: userId2 }
    ]);

    return conversation;
}

// @route   GET /api/messages
// @desc    Get all messages for the current user (across all conversations)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        // Find all conversations the user is part of
        const userConversations = await ConversationParticipant.findAll({
            where: { userId: req.user.id },
            attributes: ['conversationId']
        });

        const conversationIds = userConversations.map(uc => uc.conversationId);

        if (conversationIds.length === 0) {
            return res.json({ success: true, messages: [] });
        }

        // Fetch messages from these conversations
        const messages = await Message.findAll({
            where: {
                conversationId: {
                    [Op.in]: conversationIds
                }
            },
            order: [['createdAt', 'DESC']],
            limit: 100, // Limit to last 100 messages
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name', 'email', 'role']
                },
                {
                    model: Conversation,
                    as: 'conversation',
                    attributes: ['id', 'type', 'name']
                }
            ]
        });

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/messages/conversations
// @desc    Get user's conversations with online status
// @access  Private
router.get('/conversations', protect, async (req, res) => {
    try {
        const { UserActivity } = require('../models');

        // Find all conversation IDs where user is a participant
        const userParticipations = await ConversationParticipant.findAll({
            where: { userId: req.user.id },
            attributes: ['conversationId']
        });

        const conversationIds = userParticipations.map(p => p.conversationId);

        if (conversationIds.length === 0) {
            return res.json({ success: true, conversations: [] });
        }

        // Fetch conversations with proper ordering
        const conversations = await Conversation.findAll({
            where: {
                id: {
                    [Op.in]: conversationIds
                }
            },
            include: [
                {
                    model: Message,
                    as: 'messages',
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                    separate: true // Fetch in separate query to avoid issues
                },
                {
                    model: User,
                    as: 'participants',
                    attributes: ['id', 'name', 'role', 'email', 'phone', 'bio', 'address'],
                    include: [{
                        model: UserActivity,
                        as: 'activity',
                        attributes: ['lastSeenAt'],
                        required: false
                    }]
                }
            ],
            order: [['lastMessageAt', 'DESC']]
        });

        const formattedConversations = conversations.map(conv => {
            const lastMsg = conv.messages && conv.messages[0];

            // Determine display name/user
            let displayUser = null;
            if (conv.type === 'direct') {
                displayUser = conv.participants.find(u => u.id !== req.user.id);
            } else {
                // For groups, we might want a generic object or specific group info
                displayUser = {
                    id: 'group-' + conv.id,
                    name: conv.name || 'Group Chat',
                    role: 'group'
                };
            }

            // Calculate online status for direct chats
            let activityStatus = 'Never seen';
            if (displayUser && displayUser.activity) {
                const lastSeen = new Date(displayUser.activity.lastSeenAt);
                const now = new Date();
                const diffSeconds = Math.floor((now - lastSeen) / 1000);

                if (diffSeconds < 60) {
                    activityStatus = 'Online';
                } else if (diffSeconds < 3600) {
                    const minutes = Math.floor(diffSeconds / 60);
                    activityStatus = `${minutes}m ago`;
                } else if (diffSeconds < 86400) {
                    const hours = Math.floor(diffSeconds / 3600);
                    activityStatus = `${hours}h ago`;
                } else {
                    const days = Math.floor(diffSeconds / 86400);
                    activityStatus = `${days}d ago`;
                }
            }

            return {
                conversationId: conv.id,
                type: conv.type,
                user: displayUser,
                lastMessage: lastMsg || { content: 'No messages yet', createdAt: conv.createdAt },
                unreadCount: 0, // Placeholder
                activityStatus // Add activity status
            };
        });

        res.json({ success: true, conversations: formattedConversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// @route   GET /api/messages/direct/:userId
// @desc    Get or create a direct conversation with a user
// @access  Private
router.get('/direct/:userId', protect, async (req, res) => {
    try {
        const targetUserId = req.params.userId;

        // Prevent chatting with self
        if (targetUserId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot chat with yourself' });
        }

        const conversation = await findOrCreateDirectConversation(req.user.id, targetUserId);

        res.json({
            success: true,
            conversation: {
                id: conversation.id,
                type: 'direct',
                name: 'Direct Chat'
            }
        });
    } catch (error) {
        console.error('Get direct conversation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/messages
// @desc    Send a message (Direct or Group) with optional attachment
// @access  Private
router.post('/', protect, upload.single('attachment'), async (req, res) => {
    try {
        const { receiver, conversationId, content, isExternal, replyToId } = req.body;
        let targetConversationId = conversationId;

        if (!targetConversationId) {
            if (!receiver) {
                return res.status(400).json({ success: false, message: 'Receiver or Conversation ID required' });
            }
            // Find or create direct conversation
            const conversation = await findOrCreateDirectConversation(req.user.id, receiver);
            targetConversationId = conversation.id;
        }

        // Verify user is participant
        const isParticipant = await ConversationParticipant.findOne({
            where: { conversationId: targetConversationId, userId: req.user.id }
        });

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not a participant' });
        }

        // Handle attachment
        let attachmentUrl = null;
        let attachmentType = null;
        if (req.file) {
            attachmentUrl = `/uploads/attachments/${req.file.filename}`;
            attachmentType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';
        }

        const message = await Message.create({
            senderId: req.user.id,
            conversationId: targetConversationId,
            content: content || (req.file ? 'Sent an attachment' : ''), // Fallback content if only file sent
            attachmentUrl,
            attachmentType,
            replyToId: replyToId || null
        });

        // Update conversation lastMessageAt
        const conversation = await Conversation.findByPk(targetConversationId);
        const updates = { lastMessageAt: new Date() };

        // Auto-rename AI chat on first prompt
        if (conversation && conversation.type === 'ai_chat' && conversation.name === 'New Chat') {
            // Generate short title from content (first 3-4 words)
            const text = content || (req.file ? 'Image Upload' : 'New Conversation');
            // Remove special chars and extra spaces
            const cleanText = text.replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
            const words = cleanText.split(' ');
            // Take first 3 words
            let title = words.slice(0, 3).join(' ');
            if (!title) title = 'New Conversation';

            // Add suffix based on mode
            const modeSuffix = isExternal ? ' - Web' : ' - CRM';
            updates.name = title + modeSuffix;
        }

        await Conversation.update(
            updates,
            { where: { id: targetConversationId } }
        );

        // Fetch full message details
        await message.reload({
            include: [{ association: 'sender', attributes: ['id', 'name', 'email', 'role'] }]
        });

        res.status(201).json({
            success: true,
            message,
            conversationName: updates.name // Return new name if updated
        });

        // Trigger AI if receiver is AI Assistant
        // Trigger AI if receiver is AI Assistant
        if (receiver === 'ai-assistant' || targetConversationId) {
            // Check if the receiver in this conversation is AI
            // We can do this asynchronously
            (async () => {
                try {
                    // Check if AI is a participant in this conversation (excluding sender)
                    const participants = await ConversationParticipant.findAll({
                        where: { conversationId: targetConversationId }
                    });

                    const isAIInChat = participants.some(p => p.userId === 'ai-assistant');

                    if (isAIInChat && req.user.id !== 'ai-assistant') {
                        await aiService.processMessage(message.id, req.user.id, content, isExternal, message.conversationId);
                    }

                    // Emit socket event for real-time notifications
                    const io = req.app.get('socketio');
                    if (io) {
                        const { emitNewMessage } = require('../utils/socketEmitter');
                        await emitNewMessage(io, message, req.user.name, req.user.id);
                    }
                } catch (err) {
                    console.error('Error triggering AI or socket:', err);
                }
            })();
        }
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/messages/groups
// @desc    Create a group chat
// @access  Private
router.post('/groups', protect, async (req, res) => {
    try {
        const { name, participants } = req.body; // participants is array of userIds

        if (!name || !participants || !Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ success: false, message: 'Name and participants required' });
        }

        // Create group conversation with creator info
        const conversation = await Conversation.create({
            type: 'group',
            name,
            createdBy: req.user.id
        });

        // Add participants (including creator)
        const allParticipants = [...new Set([...participants, req.user.id])];
        const participantData = allParticipants.map(userId => ({
            conversationId: conversation.id,
            userId,
            addedBy: userId === req.user.id ? null : req.user.id // Creator added others
        }));

        await ConversationParticipant.bulkCreate(participantData);

        // Fetch created conversation with participants
        const fullConversation = await Conversation.findByPk(conversation.id, {
            include: [{
                model: User,
                as: 'participants',
                attributes: ['id', 'name', 'role']
            }]
        });

        res.status(201).json({ success: true, conversation: fullConversation });
    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PATCH /api/messages/groups/:id/name
// @desc    Update group name
// @access  Private (Admin or Creator only)
router.patch('/groups/:id/name', protect, async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { name } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        // Fetch conversation
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation || conversation.type !== 'group') {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        // Check permissions (admin or creator)
        const isAdmin = req.user.role === 'admin' || req.user.role === 'professor';
        const isCreator = conversation.createdBy === req.user.id;

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ success: false, message: 'Only admin or creator can update group name' });
        }

        // Update name
        conversation.name = name.trim();
        await conversation.save();

        res.json({ success: true, conversation });
    } catch (error) {
        console.error('Update group name error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/messages/groups/:id/leave
// @desc    Leave a group conversation
// @access  Private
router.post('/groups/:id/leave', protect, async (req, res) => {
    try {
        const conversationId = req.params.id;

        // Verify it's a group
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation || conversation.type !== 'group') {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        // Cannot leave if you're the only participant (delete group instead)
        const participantCount = await ConversationParticipant.count({
            where: { conversationId }
        });

        if (participantCount === 1) {
            return res.status(400).json({
                success: false,
                message: 'Cannot leave - you are the only member. Delete the group instead'
            });
        }

        // Remove participant
        const deleted = await ConversationParticipant.destroy({
            where: {
                conversationId,
                userId: req.user.id
            }
        });

        if (deleted === 0) {
            return res.status(404).json({ success: false, message: 'You are not a member of this group' });
        }

        res.json({ success: true, message: 'Left group successfully' });
    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/messages/conversation/:id/metadata
// @desc    Get detailed conversation metadata (for groups)
// @access  Private
router.get('/conversation/:id/metadata', protect, async (req, res) => {
    try {
        const conversationId = req.params.id;

        // Verify participant
        const isParticipant = await ConversationParticipant.findOne({
            where: { conversationId, userId: req.user.id }
        });

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Fetch conversation with full details
        const conversation = await Conversation.findByPk(conversationId, {
            include: [{
                model: ConversationParticipant,
                as: 'conversationParticipants',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'role', 'email']
                }]
            }]
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Get creator details if it's a group
        let creatorName = null;
        if (conversation.type === 'group' && conversation.createdBy) {
            const creator = await User.findByPk(conversation.createdBy, {
                attributes: ['name']
            });
            creatorName = creator ? creator.name : 'Unknown';
        }

        // Format participants with join info
        const participants = conversation.conversationParticipants ?
            conversation.conversationParticipants.map(cp => {
                let addedByName = null;
                if (cp.addedBy && cp.addedBy !== cp.userId) {
                    // Find the user who added this participant
                    const adder = conversation.conversationParticipants.find(
                        p => p.userId === cp.addedBy
                    );
                    addedByName = adder && adder.user ? adder.user.name : 'Unknown';
                }

                return {
                    id: cp.user.id,
                    name: cp.user.name,
                    role: cp.user.role,
                    email: cp.user.email,
                    joinedAt: cp.joinedAt,
                    addedBy: addedByName || (cp.userId === conversation.createdBy ? null : creatorName)
                };
            }) : [];

        const metadata = {
            id: conversation.id,
            name: conversation.name,
            type: conversation.type,
            createdBy: conversation.createdBy,
            creatorName,
            createdAt: conversation.createdAt,
            iconUrl: conversation.iconUrl,
            participants
        };

        res.json({ success: true, conversation: metadata });
    } catch (error) {
        console.error('Get conversation metadata error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/messages/conversation/:id
// @desc    Get chat history (by Conversation ID or User ID for backward compat)
// @access  Private
router.get('/conversation/:id', protect, async (req, res) => {
    try {
        const id = req.params.id;
        let conversationId;

        // Check if id is numeric (Conversation ID) or string (User ID)
        // Our User IDs are strings (e.g., 2025...), Conversation IDs are integers
        // But checking for "numeric" string might be tricky if User IDs look like numbers
        // Let's assume if it matches our User ID format (length > 10) it's a user, else conversation

        if (id.length > 10 || isNaN(id)) {
            // Treat as User ID -> Find direct conversation
            const conversation = await findOrCreateDirectConversation(req.user.id, id);
            conversationId = conversation.id;
        } else {
            conversationId = id;
        }

        // Verify participant
        const isParticipant = await ConversationParticipant.findOne({
            where: { conversationId, userId: req.user.id }
        });

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const messages = await Message.findAll({
            where: { conversationId },
            order: [['createdAt', 'ASC']],
            include: [
                { model: User, as: 'sender', attributes: ['id', 'name'] },
                {
                    model: Message,
                    as: 'replyTo',
                    attributes: ['id', 'content', 'senderId'],
                    include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }]
                }
            ]
        });

        res.json({ success: true, messages, conversationId });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Moved to top

// @route   DELETE /api/messages/conversation/:id
// @desc    Delete a specific conversation (AI Chat) or clear history (Direct)
// @access  Private
router.delete('/conversation/:id', protect, async (req, res) => {
    try {
        const id = req.params.id;
        let conversationId;

        // Check if id is User ID (legacy/direct chat clear) or Conversation ID (new AI chat delete)
        if (id.length > 10 || isNaN(id)) {
            // Treat as User ID -> Find direct conversation to clear
            const conversation = await findOrCreateDirectConversation(req.user.id, id);
            conversationId = conversation.id;

            // Just clear messages for direct chat
            await Message.destroy({
                where: { conversationId }
            });
            return res.json({ success: true, message: 'Chat history cleared' });
        } else {
            conversationId = id;

            // Verify ownership/participation
            const participation = await ConversationParticipant.findOne({
                where: { conversationId, userId: req.user.id }
            });

            if (!participation) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }

            // Delete the entire conversation and messages
            await Message.destroy({ where: { conversationId } });
            await ConversationParticipant.destroy({ where: { conversationId } });
            await Conversation.destroy({ where: { id: conversationId } });

            return res.json({ success: true, message: 'Conversation deleted' });
        }

    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
