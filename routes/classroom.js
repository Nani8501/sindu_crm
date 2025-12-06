const express = require('express');
const router = express.Router();
const { protect: auth } = require('../middleware/auth');
const { Classroom, ClassroomParticipant, User, Course } = require('../models');
const { Op } = require('sequelize');

/**
 * Generate classroom ID
 */
function generateClassroomId() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `CL-${dateStr}-${random}`;
}

/**
 * Create new classroom
 * POST /api/classroom/create
 * Access: Teacher, Admin
 */
router.post('/create', auth, async (req, res) => {
    try {
        const { courseId, title, description, scheduledStart, scheduledEnd, maxStudents, settings } = req.body;

        // Verify user is teacher or admin
        if (req.user.role !== 'professor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only teachers and admins can create classrooms'
            });
        }

        // Verify course if provided
        if (courseId) {
            const course = await Course.findByPk(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }

            // Verify teacher owns course
            if (course.professorId !== req.user.id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'You can only create classrooms for your own courses'
                });
            }
        }

        const classroom = await Classroom.create({
            id: generateClassroomId(),
            courseId: courseId || null,
            teacherId: req.user.id,
            title,
            description: description || '',
            scheduledStart: scheduledStart || null,
            scheduledEnd: scheduledEnd || null,
            status: 'scheduled',
            maxStudents: maxStudents || 60,
            settings: settings || undefined
        });

        res.json({
            success: true,
            message: 'Classroom created successfully',
            classroom
        });
    } catch (error) {
        console.error('Create classroom error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating classroom',
            error: error.message
        });
    }
});

/**
 * Get classroom details
 * GET /api/classroom/:id
 * Access: Authenticated
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'teacher',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        res.json({
            success: true,
            classroom
        });
    } catch (error) {
        console.error('Get classroom error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching classroom',
            error: error.message
        });
    }
});

/**
 * Join classroom (verify access and return token)
 * POST /api/classroom/:id/join
 * Access: Student, Teacher
 */
router.post('/:id/join', auth, async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Verify classroom is active
        if (classroom.status !== 'live' && classroom.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Classroom is not available'
            });
        }

        const isTeacher = req.user.id === classroom.teacherId;

        // For students, verify enrollment if linked to course
        if (!isTeacher && classroom.courseId) {
            const { CourseEnrollment } = require('../models');
            const enrollment = await CourseEnrollment.findOne({
                where: {
                    courseId: classroom.courseId,
                    studentId: req.user.id,
                    status: 'approved'
                }
            });

            if (!enrollment) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not enrolled in this course'
                });
            }
        }

        // Return JWT token for Socket.IO authentication
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: req.user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Access granted',
            classroom: {
                id: classroom.id,
                title: classroom.title,
                teacherId: classroom.teacherId,
                status: classroom.status
            },
            token,
            role: isTeacher ? 'teacher' : 'student'
        });
    } catch (error) {
        console.error('Join classroom error:', error);
        res.status(500).json({
            success: false,
            message: 'Error joining classroom',
            error: error.message
        });
    }
});

/**
 * Get classroom participants
 * GET /api/classroom/:id/participants
 * Access: Teacher, Admin
 */
router.get('/:id/participants', auth, async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Verify permission
        if (req.user.id !== classroom.teacherId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const participants = await ClassroomParticipant.findAll({
            where: { classroomId: req.params.id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'role']
                }
            ],
            order: [['joinedAt', 'ASC']]
        });

        res.json({
            success: true,
            participants
        });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching participants',
            error: error.message
        });
    }
});

/**
 * End classroom session
 * PUT /api/classroom/:id/end
 * Access: Teacher, Admin
 */
router.put('/:id/end', auth, async (req, res) => {
    try {
        const classroom = await Classroom.findByPk(req.params.id);

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Verify permission
        if (req.user.id !== classroom.teacherId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only the teacher can end the classroom'
            });
        }

        classroom.status = 'ended';
        classroom.actualEnd = new Date();
        await classroom.save();

        // Update all present participants
        await ClassroomParticipant.update(
            {
                isPresent: false,
                leftAt: new Date()
            },
            {
                where: {
                    classroomId: req.params.id,
                    isPresent: true
                }
            }
        );

        // Clean up mediasoup resources
        const mediasoupService = require('../services/mediasoupService');
        await mediasoupService.closeRouter(req.params.id);

        res.json({
            success: true,
            message: 'Classroom ended successfully'
        });
    } catch (error) {
        console.error('End classroom error:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending classroom',
            error: error.message
        });
    }
});

/**
 * Delete classroom
 * DELETE /api/classroom/:id
 * Access: Admin
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        // Verify admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can delete classrooms'
            });
        }

        const classroom = await Classroom.findByPk(req.params.id);

        if (!classroom) {
            return res.status(404).json({
                success: false,
                message: 'Classroom not found'
            });
        }

        // Delete participants
        await ClassroomParticipant.destroy({
            where: { classroomId: req.params.id }
        });

        // Delete classroom
        await classroom.destroy();

        res.json({
            success: true,
            message: 'Classroom deleted successfully'
        });
    } catch (error) {
        console.error('Delete classroom error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting classroom',
            error: error.message
        });
    }
});

/**
 * Get user's classrooms
 * GET /api/classroom/my-classrooms
 * Access: Authenticated
 */
router.get('/user/my-classrooms', auth, async (req, res) => {
    try {
        let classrooms;

        if (req.user.role === 'professor' || req.user.role === 'admin') {
            // Get classrooms where user is teacher
            classrooms = await Classroom.findAll({
                where: { teacherId: req.user.id },
                include: [
                    {
                        model: Course,
                        as: 'course',
                        attributes: ['id', 'name', 'description']
                    }
                ],
                order: [['scheduledStart', 'DESC']]
            });
        } else {
            // Get classrooms where user is participant
            const participantRecords = await ClassroomParticipant.findAll({
                where: { userId: req.user.id },
                attributes: ['classroomId']
            });

            const classroomIds = participantRecords.map(p => p.classroomId);

            classrooms = await Classroom.findAll({
                where: {
                    id: { [Op.in]: classroomIds }
                },
                include: [
                    {
                        model: User,
                        as: 'teacher',
                        attributes: ['id', 'name']
                    },
                    {
                        model: Course,
                        as: 'course',
                        attributes: ['id', 'name', 'description']
                    }
                ],
                order: [['scheduledStart', 'DESC']]
            });
        }

        res.json({
            success: true,
            classrooms
        });
    } catch (error) {
        console.error('Get my classrooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching classrooms',
            error: error.message
        });
    }
});

/**
 * Get active/upcoming classrooms
 * GET /api/classroom/active
 * Access: Authenticated
 */
router.get('/list/active', auth, async (req, res) => {
    try {
        const classrooms = await Classroom.findAll({
            where: {
                status: { [Op.in]: ['scheduled', 'live'] }
            },
            include: [
                {
                    model: User,
                    as: 'teacher',
                    attributes: ['id', 'name']
                },
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'name', 'description']
                }
            ],
            order: [['scheduledStart', 'ASC']]
        });

        res.json({
            success: true,
            classrooms
        });
    } catch (error) {
        console.error('Get active classrooms error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching classrooms',
            error: error.message
        });
    }
});

module.exports = router;
