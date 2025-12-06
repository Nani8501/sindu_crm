const mediasoupService = require('../services/mediasoupService');
const { Classroom, ClassroomParticipant, User } = require('../models');

/**
 * Socket.IO event handlers for online classroom
 */
module.exports = (io) => {
    // Store classroom state in memory
    const classroomState = new Map(); // classroomId -> { participants: Map, screenShare: null, remoteControl: null }

    io.on('connection', (socket) => {
        console.log(`✅ Socket connected: ${socket.id} (User: ${socket.user.name})`);

        /**
         * Join classroom room
         */
        socket.on('join-classroom', async ({ classroomId }, callback) => {
            try {
                // Verify classroom exists
                const classroom = await Classroom.findByPk(classroomId, {
                    include: [{ model: User, as: 'teacher' }]
                });

                if (!classroom) {
                    return typeof callback === 'function' ? callback({ error: 'Classroom not found' }) : null;
                }

                // Verify status
                if (classroom.status !== 'live' && classroom.status !== 'scheduled') {
                    return typeof callback === 'function' ? callback({ error: 'Classroom is not active' }) : null;
                }

                // Determine role
                const isTeacher = socket.user.id === classroom.teacherId;
                const role = isTeacher ? 'teacher' : 'student';

                // Check max students
                if (!isTeacher && classroom.status === 'live') {
                    const participantCount = await ClassroomParticipant.count({
                        where: { classroomId, role: 'student', isPresent: true }
                    });
                    if (participantCount >= classroom.maxStudents) {
                        return typeof callback === 'function' ? callback({ error: 'Classroom is full' }) : null;
                    }
                }

                // Create or update participant record
                let participant = await ClassroomParticipant.findOne({
                    where: { classroomId, userId: socket.user.id }
                });

                if (!participant) {
                    participant = await ClassroomParticipant.create({
                        classroomId,
                        userId: socket.user.id,
                        role,
                        joinedAt: new Date(),
                        isPresent: true,
                        socketId: socket.id
                    });
                } else {
                    participant.isPresent = true;
                    participant.socketId = socket.id;
                    participant.joinedAt = new Date();
                    await participant.save();
                }

                // Initialize classroom state if not exists
                if (!classroomState.has(classroomId)) {
                    classroomState.set(classroomId, {
                        participants: new Map(),
                        screenShare: null, // { userId, producerId }
                        remoteControl: null // { teacherId, studentId }
                    });
                }

                const state = classroomState.get(classroomId);
                state.participants.set(socket.user.id, {
                    socketId: socket.id,
                    userId: socket.user.id,
                    name: socket.user.name,
                    role,
                    producers: { audio: null, video: null, screen: null },
                    transports: { send: null, receive: null }
                });

                // Join socket room
                socket.join(classroomId);
                socket.classroomId = classroomId;
                socket.role = role;

                // Create router if doesn't exist (teacher starting classroom)
                if (isTeacher && !mediasoupService.getRouter(classroomId)) {
                    await mediasoupService.createRouter(classroomId);
                    // Update classroom status to live
                    classroom.status = 'live';
                    classroom.actualStart = new Date();
                    await classroom.save();
                }

                // Notify others
                socket.to(classroomId).emit('user-joined', {
                    userId: socket.user.id,
                    name: socket.user.name,
                    role
                });

                // Send current participants list
                const participants = Array.from(state.participants.values()).map(p => ({
                    userId: p.userId,
                    name: p.name,
                    role: p.role,
                    producers: p.producers
                }));

                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        classroom: {
                            id: classroom.id,
                            title: classroom.title,
                            teacherId: classroom.teacherId,
                            status: classroom.status,
                            settings: classroom.settings
                        },
                        participants,
                        screenShare: state.screenShare,
                        role
                    });
                }

                console.log(`👤 ${socket.user.name} joined classroom ${classroomId} as ${role}`);
            } catch (error) {
                console.error('Error joining classroom:', error);
                if (typeof callback === 'function') {
                    callback({ error: error.message });
                }
            }
        });

        /**
         * Get router RTP capabilities
         */
        socket.on('getRouterRtpCapabilities', (data, callback) => {
            try {
                const { classroomId } = data;
                const rtpCapabilities = mediasoupService.getRouterRtpCapabilities(classroomId);
                if (typeof callback === 'function') callback({ rtpCapabilities });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Create WebRTC transport
         */
        socket.on('createTransport', async (data, callback) => {
            try {
                const { classroomId, direction } = data; // direction: 'send' or 'receive'
                const transportParams = await mediasoupService.createWebRtcTransport(classroomId);

                // Store transport ID
                const state = classroomState.get(classroomId);
                if (state) {
                    const participant = state.participants.get(socket.user.id);
                    if (participant) {
                        participant.transports[direction] = transportParams.id;
                    }
                }

                if (typeof callback === 'function') callback({ success: true, params: transportParams });
            } catch (error) {
                console.error('Create transport error:', error);
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Connect transport
         */
        socket.on('connectTransport', async (data, callback) => {
            try {
                const { transportId, dtlsParameters } = data;
                await mediasoupService.connectTransport(transportId, dtlsParameters);
                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                console.error('Connect transport error:', error);
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Produce (publish stream)
         */
        socket.on('produce', async (data, callback) => {
            try {
                const { transportId, kind, rtpParameters, appData } = data;
                const { classroomId } = socket;

                // Add user info to appData
                appData.userId = socket.user.id;
                appData.classroomId = classroomId;

                const { id: producerId } = await mediasoupService.produce(
                    transportId,
                    kind,
                    rtpParameters,
                    appData
                );

                // Store producer ID
                const state = classroomState.get(classroomId);
                if (state) {
                    const participant = state.participants.get(socket.user.id);
                    if (participant) {
                        const producerType = appData.source || kind; // 'audio', 'video', 'screen'
                        participant.producers[producerType] = producerId;

                        // If screen share, update state
                        if (appData.source === 'screen') {
                            // Auto-stop any existing screen share
                            if (state.screenShare && state.screenShare.userId !== socket.user.id) {
                                const prevUser = state.participants.get(state.screenShare.userId);
                                if (prevUser && prevUser.producers.screen) {
                                    await mediasoupService.closeProducer(prevUser.producers.screen);
                                    prevUser.producers.screen = null;

                                    // Notify the previous sharer
                                    io.to(prevUser.socketId).emit('screen-share-stopped', {
                                        reason: 'replaced',
                                        by: socket.user.name
                                    });
                                }
                            }

                            state.screenShare = {
                                userId: socket.user.id,
                                producerId,
                                userName: socket.user.name
                            };

                            // Broadcast screen share started
                            socket.to(classroomId).emit('screen-share-started', {
                                userId: socket.user.id,
                                userName: socket.user.name,
                                producerId
                            });
                        }
                    }
                }

                // Notify others to consume this producer
                socket.to(classroomId).emit('new-producer', {
                    producerId,
                    userId: socket.user.id,
                    userName: socket.user.name,
                    kind,
                    source: appData.source
                });

                if (typeof callback === 'function') callback({ success: true, id: producerId });
            } catch (error) {
                console.error('Produce error:', error);
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Consume (subscribe to stream)
         */
        socket.on('consume', async (data, callback) => {
            try {
                const { transportId, producerId, rtpCapabilities } = data;

                const consumerParams = await mediasoupService.consume(
                    transportId,
                    producerId,
                    rtpCapabilities
                );

                if (typeof callback === 'function') callback({ success: true, params: consumerParams });
            } catch (error) {
                console.error('Consume error:', error);
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Resume consumer
         */
        socket.on('resumeConsumer', async (data, callback) => {
            try {
                const { consumerId } = data;
                const consumer = mediasoupService.consumers.get(consumerId);
                if (consumer) {
                    await consumer.resume();
                }
                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Pause producer (mute)
         */
        socket.on('pauseProducer', async (data, callback) => {
            try {
                const { producerId } = data;
                await mediasoupService.pauseProducer(producerId);

                // Notify room
                socket.to(socket.classroomId).emit('producer-paused', {
                    userId: socket.user.id,
                    producerId
                });

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Resume producer (unmute)
         */
        socket.on('resumeProducer', async (data, callback) => {
            try {
                const { producerId } = data;
                await mediasoupService.resumeProducer(producerId);

                // Notify room
                socket.to(socket.classroomId).emit('producer-resumed', {
                    userId: socket.user.id,
                    producerId
                });

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Close producer (stop stream)
         */
        socket.on('closeProducer', async (data, callback) => {
            try {
                const { producerId, source } = data;
                await mediasoupService.closeProducer(producerId);

                // Update state
                const state = classroomState.get(socket.classroomId);
                if (state) {
                    const participant = state.participants.get(socket.user.id);
                    if (participant) {
                        participant.producers[source] = null;

                        // If stopping screen share, clear state
                        if (source === 'screen' && state.screenShare?.userId === socket.user.id) {
                            state.screenShare = null;
                            socket.to(socket.classroomId).emit('screen-share-stopped', {
                                userId: socket.user.id
                            });
                        }
                    }
                }

                // Notify room
                socket.to(socket.classroomId).emit('producer-closed', {
                    userId: socket.user.id,
                    producerId,
                    source
                });

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Student requests screen share permission
         */
        socket.on('request-screen-share', async (data, callback) => {
            try {
                const { classroomId } = socket;
                const classroom = await Classroom.findByPk(classroomId);

                if (!classroom) {
                    return typeof callback === 'function' ? callback({ error: 'Classroom not found' }) : null;
                }

                // Find teacher socket
                const state = classroomState.get(classroomId);
                const teacherData = Array.from(state.participants.values()).find(p => p.role === 'teacher');

                if (!teacherData) {
                    return typeof callback === 'function' ? callback({ error: 'Teacher not in classroom' }) : null;
                }

                // Send request to teacher
                io.to(teacherData.socketId).emit('screen-share-request', {
                    userId: socket.user.id,
                    userName: socket.user.name
                });

                if (typeof callback === 'function') callback({ success: true, message: 'Request sent to teacher' });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Teacher approves screen share
         */
        socket.on('approve-screen-share', async (data, callback) => {
            try {
                const { userId } = data;
                const { classroomId } = socket;

                // Verify teacher
                if (socket.role !== 'teacher') {
                    return typeof callback === 'function' ? callback({ error: 'Only teacher can approve' }) : null;
                }

                const state = classroomState.get(classroomId);
                const studentData = state.participants.get(userId);

                if (!studentData) {
                    return typeof callback === 'function' ? callback({ error: 'Student not found' }) : null;
                }

                // Stop teacher's screen share if active
                const teacherData = state.participants.get(socket.user.id);
                if (teacherData.producers.screen) {
                    await mediasoupService.closeProducer(teacherData.producers.screen);
                    teacherData.producers.screen = null;
                    socket.emit('screen-share-stopped', { reason: 'student-approved' });
                }

                // Notify student
                io.to(studentData.socketId).emit('screen-share-approved');

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Teacher rejects screen share
         */
        socket.on('reject-screen-share', async (data, callback) => {
            try {
                const { userId } = data;

                // Verify teacher
                if (socket.role !== 'teacher') {
                    return typeof callback === 'function' ? callback({ error: 'Only teacher can reject' }) : null;
                }

                const state = classroomState.get(socket.classroomId);
                const studentData = state.participants.get(userId);

                if (studentData) {
                    io.to(studentData.socketId).emit('screen-share-rejected');
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Teacher requests remote control
         */
        socket.on('request-remote-control', async (data, callback) => {
            try {
                const { studentId } = data;

                // Verify teacher
                if (socket.role !== 'teacher') {
                    return typeof callback === 'function' ? callback({ error: 'Only teacher can request remote control' }) : null;
                }

                const state = classroomState.get(socket.classroomId);
                const studentData = state.participants.get(studentId);

                if (!studentData) {
                    return typeof callback === 'function' ? callback({ error: 'Student not found' }) : null;
                }

                // Check if student is screen sharing
                if (!studentData.producers.screen) {
                    return typeof callback === 'function' ? callback({ error: 'Student must be screen sharing' }) : null;
                }

                // Send request to student
                io.to(studentData.socketId).emit('remote-control-request', {
                    teacherId: socket.user.id,
                    teacherName: socket.user.name
                });

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Student approves remote control
         */
        socket.on('approve-remote-control', async (data, callback) => {
            try {
                const { teacherId } = data;
                const state = classroomState.get(socket.classroomId);

                state.remoteControl = {
                    teacherId,
                    studentId: socket.user.id
                };

                const teacherData = state.participants.get(teacherId);
                if (teacherData) {
                    io.to(teacherData.socketId).emit('remote-control-approved', {
                        studentId: socket.user.id,
                        studentName: socket.user.name
                    });
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Student rejects remote control
         */
        socket.on('reject-remote-control', async (data, callback) => {
            try {
                const { teacherId } = data;
                const state = classroomState.get(socket.classroomId);
                const teacherData = state.participants.get(teacherId);

                if (teacherData) {
                    io.to(teacherData.socketId).emit('remote-control-rejected', {
                        studentId: socket.user.id
                    });
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Remote control events (mouse, keyboard)
         */
        socket.on('remote-mouse-move', (data) => {
            const state = classroomState.get(socket.classroomId);
            if (!state.remoteControl || state.remoteControl.teacherId !== socket.user.id) {
                return;
            }

            const studentData = state.participants.get(state.remoteControl.studentId);
            if (studentData) {
                io.to(studentData.socketId).emit('remote-mouse-move', data);
            }
        });

        socket.on('remote-mouse-click', (data) => {
            const state = classroomState.get(socket.classroomId);
            if (!state.remoteControl || state.remoteControl.teacherId !== socket.user.id) {
                return;
            }

            const studentData = state.participants.get(state.remoteControl.studentId);
            if (studentData) {
                io.to(studentData.socketId).emit('remote-mouse-click', data);
            }
        });

        socket.on('remote-keyboard', (data) => {
            const state = classroomState.get(socket.classroomId);
            if (!state.remoteControl || state.remoteControl.teacherId !== socket.user.id) {
                return;
            }

            const studentData = state.participants.get(state.remoteControl.studentId);
            if (studentData) {
                io.to(studentData.socketId).emit('remote-keyboard', data);
            }
        });

        socket.on('remote-scroll', (data) => {
            const state = classroomState.get(socket.classroomId);
            if (!state.remoteControl || state.remoteControl.teacherId !== socket.user.id) {
                return;
            }

            const studentData = state.participants.get(state.remoteControl.studentId);
            if (studentData) {
                io.to(studentData.socketId).emit('remote-scroll', data);
            }
        });

        /**
         * Stop remote control
         */
        socket.on('stop-remote-control', async (data, callback) => {
            try {
                const state = classroomState.get(socket.classroomId);
                if (!state.remoteControl) {
                    return typeof callback === 'function' ? callback({ success: true }) : null;
                }

                const { teacherId, studentId } = state.remoteControl;

                // Verify permission (either teacher or student can stop)
                if (socket.user.id !== teacherId && socket.user.id !== studentId) {
                    return typeof callback === 'function' ? callback({ error: 'Not authorized' }) : null;
                }

                state.remoteControl = null;

                // Notify both parties
                const teacherData = state.participants.get(teacherId);
                const studentData = state.participants.get(studentId);

                if (teacherData) {
                    io.to(teacherData.socketId).emit('remote-control-stopped');
                }
                if (studentData) {
                    io.to(studentData.socketId).emit('remote-control-stopped');
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Teacher mutes student
         */
        socket.on('mute-user', async (data, callback) => {
            try {
                const { userId, kind } = data; // kind: 'audio' or 'video'

                // Verify teacher
                if (socket.role !== 'teacher') {
                    return typeof callback === 'function' ? callback({ error: 'Only teacher can mute users' }) : null;
                }

                const state = classroomState.get(socket.classroomId);
                const studentData = state.participants.get(userId);

                if (!studentData) {
                    return typeof callback === 'function' ? callback({ error: 'User not found' }) : null;
                }

                const producerId = studentData.producers[kind];
                if (producerId) {
                    await mediasoupService.pauseProducer(producerId);
                }

                // Update permissions
                const participant = await ClassroomParticipant.findOne({
                    where: { classroomId: socket.classroomId, userId }
                });

                if (participant) {
                    const permissions = participant.permissions || {};
                    permissions.isMutedByTeacher = true;
                    participant.permissions = permissions;
                    await participant.save();
                }

                // Notify student
                io.to(studentData.socketId).emit('muted-by-teacher', { kind });

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Teacher kicks student
         */
        socket.on('kick-user', async (data, callback) => {
            try {
                const { userId } = data;

                // Verify teacher
                if (socket.role !== 'teacher') {
                    return typeof callback === 'function' ? callback({ error: 'Only teacher can kick users' }) : null;
                }

                const state = classroomState.get(socket.classroomId);
                const studentData = state.participants.get(userId);

                if (studentData) {
                    // Notify student
                    io.to(studentData.socketId).emit('kicked-from-classroom', {
                        reason: 'Removed by teacher'
                    });

                    // Force disconnect after a delay
                    setTimeout(() => {
                        io.sockets.sockets.get(studentData.socketId)?.disconnect(true);
                    }, 1000);
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Chat message
         */
        socket.on('chat-message', (data, callback) => {
            try {
                const { message } = data;

                // Broadcast to classroom
                io.to(socket.classroomId).emit('chat-message', {
                    userId: socket.user.id,
                    userName: socket.user.name,
                    message,
                    timestamp: new Date()
                });

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Raise hand
         */
        socket.on('raise-hand', (data, callback) => {
            try {
                // Notify teacher
                const state = classroomState.get(socket.classroomId);
                const teacherData = Array.from(state.participants.values()).find(p => p.role === 'teacher');

                if (teacherData) {
                    io.to(teacherData.socketId).emit('student-raised-hand', {
                        userId: socket.user.id,
                        userName: socket.user.name
                    });
                }

                if (typeof callback === 'function') callback({ success: true });
            } catch (error) {
                if (typeof callback === 'function') callback({ error: error.message });
            }
        });

        /**
         * Disconnect handler
         */
        socket.on('disconnect', async () => {
            console.log(`❌ Socket disconnected: ${socket.id}`);

            if (!socket.classroomId) return;

            try {
                const state = classroomState.get(socket.classroomId);
                if (state) {
                    const participant = state.participants.get(socket.user.id);
                    if (participant) {
                        // Close all producers
                        for (const [type, producerId] of Object.entries(participant.producers)) {
                            if (producerId) {
                                await mediasoupService.closeProducer(producerId);
                            }
                        }

                        // Close transports
                        for (const transportId of Object.values(participant.transports)) {
                            if (transportId) {
                                await mediasoupService.closeTransport(transportId);
                            }
                        }

                        // Remove from state
                        state.participants.delete(socket.user.id);

                        // Clear screen share if user was sharing
                        if (state.screenShare?.userId === socket.user.id) {
                            state.screenShare = null;
                        }

                        // Clear remote control if user was involved
                        if (state.remoteControl) {
                            if (state.remoteControl.teacherId === socket.user.id ||
                                state.remoteControl.studentId === socket.user.id) {
                                state.remoteControl = null;
                            }
                        }
                    }
                }

                // Update database
                const participant = await ClassroomParticipant.findOne({
                    where: { classroomId: socket.classroomId, userId: socket.user.id }
                });

                if (participant) {
                    participant.isPresent = false;
                    participant.leftAt = new Date();
                    participant.duration = Math.floor((participant.leftAt - participant.joinedAt) / 1000);
                    await participant.save();
                }

                // Notify room
                socket.to(socket.classroomId).emit('user-left', {
                    userId: socket.user.id,
                    userName: socket.user.name
                });
            } catch (error) {
                console.error('Disconnect cleanup error:', error);
            }
        });
    });

    console.log('✅ Classroom Socket.IO handlers registered');
};
