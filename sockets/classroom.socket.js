const { Classroom, ClassroomParticipant, User } = require('../models');

module.exports = (io) => {
    // Store classroom state in memory
    const classroomParticipants = new Map(); // classroomId -> Map<userId, {socketId, name, role}>

    io.on('connection', (socket) => {
        console.log(`✅ Socket connected: ${socket.id} (User: ${socket.user.name})`);

        /**
         * Join classroom room
         */
        socket.on('join-classroom', async ({ classroomId }, callback) => {
            try {
                // Verify classroom exists
                const classroom = await Classroom.findByPk(classroomId);
                if (!classroom) {
                    return typeof callback === 'function' ? callback({ error: 'Classroom not found' }) : null;
                }

                const role = socket.user.role === 'admin' || classroom.teacherId === socket.user.id ? 'teacher' : 'student';

                // Add to state
                if (!classroomParticipants.has(classroomId)) {
                    classroomParticipants.set(classroomId, new Map());
                }
                const participants = classroomParticipants.get(classroomId);
                participants.set(socket.user.id, {
                    socketId: socket.id,
                    name: socket.user.name,
                    role: role,
                    userId: socket.user.id
                });

                // Join socket room
                socket.join(classroomId);
                socket.classroomId = classroomId;

                // Notify others in the room
                socket.to(classroomId).emit('user-connected', {
                    userId: socket.user.id,
                    socketId: socket.id,
                    name: socket.user.name,
                    role: role
                });

                // Get list of existing participants to return to new user
                const existingParticipants = Array.from(participants.values())
                    .filter(p => p.socketId !== socket.id); // Exclude self

                console.log(`👤 ${socket.user.name} joined classroom ${classroomId} (P2P Mode)`);

                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        participants: existingParticipants,
                        classroom: {
                            id: classroom.id,
                            title: classroom.title,
                            teacherId: classroom.teacherId,
                            status: classroom.status
                        }
                    });
                }
            } catch (error) {
                console.error('Error joining classroom:', error);
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * P2P Signaling (Offer, Answer, ICE Candidate)
         * Data: { to: targetSocketId, signal: SDP/Candidate }
         */
        socket.on('signal', (data) => {
            const { to, signal } = data;
            io.to(to).emit('signal', {
                from: socket.id,
                userId: socket.user.id,
                signal
            });
        });

        /**
         * Chat Message
         */
        socket.on('chat-message', (data, callback) => {
            if (!socket.classroomId) return;
            io.to(socket.classroomId).emit('chat-message', {
                userId: socket.user.id,
                userName: socket.user.name,
                message: data.message,
                timestamp: new Date()
            });
            if (typeof callback === 'function') callback({ success: true });
        });

        /**
         * Raise Hand
         */
        socket.on('raise-hand', (data, callback) => {
            if (!socket.classroomId) return;
            // Broadcast to everyone (or just teacher)
            socket.to(socket.classroomId).emit('student-raised-hand', {
                userId: socket.user.id,
                userName: socket.user.name
            });
            if (typeof callback === 'function') callback({ success: true });
        });

        /**
         * Disconnect
         */
        socket.on('disconnect', () => {
            if (socket.classroomId && classroomParticipants.has(socket.classroomId)) {
                const participants = classroomParticipants.get(socket.classroomId);
                participants.delete(socket.user.id);

                // Notify others
                socket.to(socket.classroomId).emit('user-disconnected', {
                    userId: socket.user.id,
                    socketId: socket.id
                });

                if (participants.size === 0) {
                    classroomParticipants.delete(socket.classroomId);
                }
            }
        });
    });
};
