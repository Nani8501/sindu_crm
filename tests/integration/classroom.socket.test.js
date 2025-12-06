const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Mock models and services
jest.mock('../../models', () => ({
    Classroom: {
        findByPk: jest.fn()
    },
    ClassroomParticipant: {
        findOne: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
    },
    User: {
        findByPk: jest.fn()
    }
}));

jest.mock('../../services/mediasoupService', () => ({
    getRouter: jest.fn(() => ({ id: 'test-router' })),
    createRouter: jest.fn(() => Promise.resolve({ id: 'test-router' })),
    getRouterRtpCapabilities: jest.fn(() => ({
        codecs: [{ kind: 'audio', mimeType: 'audio/opus' }]
    })),
    createWebRtcTransport: jest.fn(() => Promise.resolve({
        id: 'test-transport',
        iceParameters: {},
        iceCandidates: [],
        dtlsParameters: {}
    })),
    connectTransport: jest.fn(() => Promise.resolve()),
    produce: jest.fn(() => Promise.resolve({ id: 'test-producer', kind: 'video' })),
    consume: jest.fn(() => Promise.resolve({
        id: 'test-consumer',
        producerId: 'test-producer',
        kind: 'video',
        rtpParameters: {}
    })),
    pauseProducer: jest.fn(() => Promise.resolve()),
    resumeProducer: jest.fn(() => Promise.resolve()),
    closeProducer: jest.fn(() => Promise.resolve()),
    closeTransport: jest.fn(() => Promise.resolve())
}));

const { Classroom, ClassroomParticipant, User } = require('../../models');

describe('Classroom Socket.IO Events', () => {
    let io, serverSocket, clientSocket;
    let httpServer;

    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);

        // Simple auth middleware
        io.use(async (socket, next) => {
            const token = socket.handshake.auth.token;
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.user = {
                    id: decoded.id,
                    name: 'Test User',
                    role: 'professor'
                };
                next();
            } catch (error) {
                next(new Error('Authentication error'));
            }
        });

        // Load classroom socket handlers
        require('../../sockets/classroom.socket')(io);

        httpServer.listen(() => {
            const port = httpServer.address().port;
            const token = jwt.sign({ id: 'test-user-id' }, process.env.JWT_SECRET);

            clientSocket = new Client(`http://localhost:${port}`, {
                auth: { token }
            });

            io.on('connection', (socket) => {
                serverSocket = socket;
            });

            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        Classroom.findByPk.mockResolvedValue({
            id: 'CL-TEST-001',
            title: 'Test Class',
            teacherId: 'test-user-id',
            status: 'live',
            maxStudents: 60,
            settings: {},
            save: jest.fn()
        });

        ClassroomParticipant.findOne.mockResolvedValue(null);
        ClassroomParticipant.create.mockResolvedValue({
            id: 1,
            classroomId: 'CL-TEST-001',
            userId: 'test-user-id',
            role: 'teacher',
            save: jest.fn()
        });
        ClassroomParticipant.count.mockResolvedValue(0);

        User.findByPk.mockResolvedValue({
            id: 'test-user-id',
            name: 'Test User',
            role: 'professor'
        });
    });

    describe('join-classroom event', () => {
        test('should join classroom successfully', (done) => {
            clientSocket.emit('join-classroom', { classroomId: 'CL-TEST-001' }, (response) => {
                expect(response.success).toBe(true);
                expect(response.classroom).toBeDefined();
                expect(response.classroom.id).toBe('CL-TEST-001');
                expect(response.role).toBe('teacher');
                done();
            });
        });

        test('should reject if classroom not found', (done) => {
            Classroom.findByPk.mockResolvedValue(null);

            clientSocket.emit('join-classroom', { classroomId: 'CL-INVALID' }, (response) => {
                expect(response.error).toBeDefined();
                expect(response.error).toContain('not found');
                done();
            });
        });

        test('should reject if classroom is full', (done) => {
            Classroom.findByPk.mockResolvedValue({
                id: 'CL-TEST-001',
                teacherId: 'other-teacher',
                status: 'live',
                maxStudents: 2
            });
            ClassroomParticipant.count.mockResolvedValue(2);

            clientSocket.emit('join-classroom', { classroomId: 'CL-TEST-001' }, (response) => {
                expect(response.error).toBeDefined();
                expect(response.error).toContain('full');
                done();
            });
        });
    });

    describe('getRouterRtpCapabilities event', () => {
        test('should return RTP capabilities', (done) => {
            clientSocket.emit('getRouterRtpCapabilities', { classroomId: 'CL-TEST-001' }, (response) => {
                expect(response.rtpCapabilities).toBeDefined();
                expect(response.rtpCapabilities.codecs).toBeDefined();
                done();
            });
        });
    });

    describe('createTransport event', () => {
        test('should create WebRTC transport', (done) => {
            clientSocket.emit('createTransport', {
                classroomId: 'CL-TEST-001',
                direction: 'send'
            }, (response) => {
                expect(response.success).toBe(true);
                expect(response.params).toBeDefined();
                expect(response.params.id).toBe('test-transport');
                done();
            });
        });
    });

    describe('produce event', () => {
        test('should create producer', (done) => {
            // First join classroom
            clientSocket.emit('join-classroom', { classroomId: 'CL-TEST-001' }, () => {
                clientSocket.emit('produce', {
                    transportId: 'test-transport',
                    kind: 'video',
                    rtpParameters: {},
                    appData: { source: 'camera' }
                }, (response) => {
                    expect(response.success).toBe(true);
                    expect(response.id).toBe('test-producer');
                    done();
                });
            });
        });
    });

    describe('Screen sharing events', () => {
        test('should handle screen share request', (done) => {
            // Join as student first
            const studentSocket = new Client(`http://localhost:${httpServer.address().port}`, {
                auth: { token: jwt.sign({ id: 'student-id' }, process.env.JWT_SECRET) }
            });

            studentSocket.on('connect', () => {
                studentSocket.emit('join-classroom', { classroomId: 'CL-TEST-001' }, () => {
                    studentSocket.emit('request-screen-share', {}, (response) => {
                        expect(response.success).toBe(true);
                        expect(response.message).toContain('sent');
                        studentSocket.close();
                        done();
                    });
                });
            });
        });
    });

    describe('Remote control events', () => {
        test('should handle remote control request', (done) => {
            clientSocket.emit('join-classroom', { classroomId: 'CL-TEST-001' }, () => {
                clientSocket.emit('request-remote-control', { studentId: 'student-id' }, (response) => {
                    // Should fail because student doesn't exist in this test
                    expect(response.error).toBeDefined();
                    done();
                });
            });
        });
    });

    describe('Chat events', () => {
        test('should broadcast chat message', (done) => {
            clientSocket.emit('join-classroom', { classroomId: 'CL-TEST-001' }, () => {
                clientSocket.on('chat-message', (data) => {
                    expect(data.message).toBe('Hello');
                    expect(data.userName).toBe('Test User');
                    done();
                });

                // Send message from same socket (in real scenario would be different clients)
                clientSocket.emit('chat-message', { message: 'Hello' }, () => { });
            });
        });
    });
});
