const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import database and models
const { sequelize, User, Message } = require('./models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { generateUserId } = require('./utils/idGenerator');

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const assignmentRoutes = require('./routes/assignments');
const messageRoutes = require('./routes/messages');
const sessionRoutes = require('./routes/sessions');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
// const conversationRoutes = require('./routes/conversations'); // TODO: Create this file
const attendanceRoutes = require('./routes/attendance');

// Initialize app
const app = express();

// Create HTTP server for Socket.IO
const http = require('http');
const { Server } = require('socket.io');
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Socket.IO authentication middleware
const socketAuth = require('./middleware/socketAuth');
io.use(socketAuth);

// Classroom Socket.IO handlers
require('./sockets/classroom.socket')(io);


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection and initialization
const connectDB = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ MySQL Database Connected Successfully');

        // Sync all models (creates tables if they don't exist, but doesn't alter existing ones)
        // Disabled to prevent schema conflicts - tables are managed manually
        // await sequelize.sync({ alter: false });
        console.log('✅ Database tables ready (manual schema management)');

        // Create default admin user if not exists
        async function createDefaultAdmin() {
            try {
                const adminEmail = 'admin@sindhusoftwaretraining.in';
                const adminExists = await User.findOne({ where: { email: adminEmail } });

                if (!adminExists) {
                    const hashedPassword = await bcrypt.hash('admin123', 10);
                    const adminId = generateUserId('admin');

                    await User.create({
                        id: adminId,
                        name: 'Admin',
                        email: adminEmail,
                        password: hashedPassword,
                        role: 'admin',
                        phone: '1234567890'
                    });
                    console.log('✅ Default admin user created');
                    console.log(`   ID: ${adminId}`);
                    console.log('   Email: admin@sindhusoftwaretraining.in');
                    console.log('   Password: admin123');
                }
            } catch (error) {
                console.error('Error creating default admin:', error);
            }
        }
        await createDefaultAdmin();

        // Create Study Buddy User
        async function createAIAssistant() {
            try {
                const aiEmail = 'ai@crm.com';
                const aiExists = await User.findOne({ where: { email: aiEmail } });

                if (!aiExists) {
                    const hashedPassword = await bcrypt.hash('ai123456', 10);
                    const aiId = 'ai-assistant';

                    await User.create({
                        id: aiId,
                        name: 'Study Buddy',
                        email: aiEmail,
                        password: hashedPassword,
                        role: 'admin', // Give admin role so it can access everything if needed, or create special role
                        phone: '0000000000',
                        bio: 'I am Study Buddy, your CRM AI Assistant.'
                    });
                    console.log('✅ Study Buddy user created');
                }
            } catch (error) {
                console.error('Error creating Study Buddy:', error);
            }
        }
        await createAIAssistant();
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};

// Connect to database
connectDB();

// Initialize mediasoup workers
const mediasoupService = require('./services/mediasoupService');
mediasoupService.initWorkers().then(() => {
    console.log('✅ Mediasoup workers initialized and ready');
}).catch(error => {
    console.error('❌ Mediasoup initialization failed:', error);
    process.exit(1);
});

// Start automated message cleanup job (deletes messages older than 7 days)
const messageCleanup = require('./jobs/messageCleanup');
messageCleanup.start();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
// app.use('/api/conversations', conversationRoutes); // TODO: Create conversations routes
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classroom', require('./routes/classroom'));
app.use('/api/quizzes', require('./routes/quizzes'));

// Root route
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Sindhu Software Training CRM API',
        version: '1.0.0',
        database: 'MySQL'
    });
});

// Catch-all route - serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: MySQL`);
    console.log(`🎥 Online Classroom: Enabled (mediasoup + Socket.IO)`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing server gracefully');
    httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});
