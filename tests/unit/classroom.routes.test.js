const request = require('supertest');
const express = require('express');
const classroomRoutes = require('../../routes/classroom');
const { Classroom, ClassroomParticipant, User, Course } = require('../../models');

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
    protect: (req, res, next) => {
        req.user = {
            id: 'test-user-id',
            role: 'professor'
        };
        next();
    }
}));

// Mock models
jest.mock('../../models', () => ({
    Classroom: {
        create: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
    },
    ClassroomParticipant: {
        create: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    },
    User: {
        findByPk: jest.fn()
    },
    Course: {
        findByPk: jest.fn()
    },
    CourseEnrollment: {
        findOne: jest.fn()
    }
}));

// Mock mediasoup service
jest.mock('../../services/mediasoupService', () => ({
    closeRouter: jest.fn(() => Promise.resolve())
}));

describe('Classroom Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/classroom', classroomRoutes);
        jest.clearAllMocks();
    });

    describe('POST /api/classroom/create', () => {
        test('should create classroom successfully', async () => {
            const mockClassroom = {
                id: 'CL-20251201-12345',
                title: 'Test Classroom',
                teacherId: 'test-user-id',
                status: 'scheduled'
            };

            Classroom.create.mockResolvedValue(mockClassroom);
            Course.findByPk.mockResolvedValue({ id: 1, professorId: 'test-user-id' });

            const response = await request(app)
                .post('/api/classroom/create')
                .send({
                    title: 'Test Classroom',
                    courseId: '1',
                    description: 'Test description',
                    maxStudents: 60
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.classroom).toBeDefined();
            expect(Classroom.create).toHaveBeenCalled();
        });

        test('should reject non-teacher users', async () => {
            // Override the mocked auth middleware for this test
            const studentApp = express();
            studentApp.use(express.json());
            studentApp.use((req, res, next) => {
                req.user = { id: 'student-id', role: 'student' };
                next();
            });
            studentApp.use('/api/classroom', classroomRoutes);

            const response = await request(studentApp)
                .post('/api/classroom/create')
                .send({ title: 'Test' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        test('should validate course ownership', async () => {
            Course.findByPk.mockResolvedValue({ id: 1, professorId: 'other-professor-id' });

            const response = await request(app)
                .post('/api/classroom/create')
                .send({
                    title: 'Test Classroom',
                    courseId: '1'
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/classroom/:id', () => {
        test('should get classroom details', async () => {
            const mockClassroom = {
                id: 'CL-20251201-12345',
                title: 'Test Classroom',
                teacher: { id: 'test-user-id', name: 'Test Teacher' },
                course: { id: 1, title: 'Test Course' }
            };

            Classroom.findByPk.mockResolvedValue(mockClassroom);

            const response = await request(app)
                .get('/api/classroom/CL-20251201-12345');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.classroom).toBeDefined();
        });

        test('should return 404 for non-existent classroom', async () => {
            Classroom.findByPk.mockResolvedValue(null);

            const response = await request(app)
                .get('/api/classroom/non-existent');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/classroom/:id/join', () => {
        test('should allow teacher to join classroom', async () => {
            const mockClassroom = {
                id: 'CL-20251201-12345',
                title: 'Test Classroom',
                teacherId: 'test-user-id',
                status: 'live'
            };

            Classroom.findByPk.mockResolvedValue(mockClassroom);

            const response = await request(app)
                .post('/api/classroom/CL-20251201-12345/join');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.role).toBe('teacher');
        });

        test('should return error for ended classroom', async () => {
            const mockClassroom = {
                id: 'CL-20251201-12345',
                status: 'ended'
            };

            Classroom.findByPk.mockResolvedValue(mockClassroom);

            const response = await request(app)
                .post('/api/classroom/CL-20251201-12345/join');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /api/classroom/:id/end', () => {
        test('should end classroom session', async () => {
            const mockClassroom = {
                id: 'CL-20251201-12345',
                teacherId: 'test-user-id',
                status: 'live',
                save: jest.fn()
            };

            Classroom.findByPk.mockResolvedValue(mockClassroom);
            ClassroomParticipant.update.mockResolvedValue([1]);

            const response = await request(app)
                .put('/api/classroom/CL-20251201-12345/end');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockClassroom.status).toBe('ended');
            expect(mockClassroom.save).toHaveBeenCalled();
        });

        test('should prevent non-teacher from ending classroom', async () => {
            const mockClassroom = {
                id: 'CL-20251201-12345',
                teacherId: 'other-teacher-id',
                status: 'live'
            };

            Classroom.findByPk.mockResolvedValue(mockClassroom);

            const response = await request(app)
                .put('/api/classroom/CL-20251201-12345/end');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/classroom/user/my-classrooms', () => {
        test('should get teacher classrooms', async () => {
            const mockClassrooms = [
                { id: 'CL-1', title: 'Class 1' },
                { id: 'CL-2', title: 'Class 2' }
            ];

            Classroom.findAll.mockResolvedValue(mockClassrooms);

            const response = await request(app)
                .get('/api/classroom/user/my-classrooms');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.classrooms).toHaveLength(2);
        });
    });

    describe('GET /api/classroom/list/active', () => {
        test('should get active classrooms', async () => {
            const mockClassrooms = [
                { id: 'CL-1', status: 'live' },
                { id: 'CL-2', status: 'scheduled' }
            ];

            Classroom.findAll.mockResolvedValue(mockClassrooms);

            const response = await request(app)
                .get('/api/classroom/list/active');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.classrooms)).toBe(true);
        });
    });
});
