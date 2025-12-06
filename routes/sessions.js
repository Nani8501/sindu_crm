const express = require('express');
const router = express.Router();
const { Session, Course, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/sessions
// @desc    Get sessions (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let sessions;

        if (req.user.role === 'professor') {
            sessions = await Session.findAll({
                where: { professorId: req.user.id },
                include: [
                    { association: 'course', attributes: ['id', 'name'] }
                ],
                order: [['scheduledAt', 'ASC']]
            });

            // Get students for each session from the course
            for (let session of sessions) {
                if (session.course) {
                    const course = await Course.findByPk(session.course.id, {
                        include: [{ association: 'students', attributes: ['id', 'name', 'email'] }]
                    });
                    session.dataValues.students = course.students;
                }
            }
        } else if (req.user.role === 'student') {
            // Get courses student is enrolled in
            const user = await User.findByPk(req.user.id, {
                include: [{ association: 'enrolledCourses' }]
            });
            const courseIds = user.enrolledCourses.map(c => c.id);

            sessions = await Session.findAll({
                where: { courseId: courseIds },
                include: [
                    { association: 'course', attributes: ['id', 'name'] },
                    { association: 'professor', attributes: ['id', 'name', 'email'] }
                ],
                order: [['scheduledAt', 'ASC']]
            });
        } else {
            sessions = await Session.findAll({
                include: [
                    { association: 'course', attributes: ['id', 'name'] },
                    { association: 'professor', attributes: ['id', 'name'] }
                ],
                order: [['scheduledAt', 'ASC']]
            });
        }

        res.json({ success: true, count: sessions.length, sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/sessions
// @desc    Schedule a session (supports recurrence)
// @access  Private (Professor/Admin)
router.post('/', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { course, title, description, scheduledAt, duration, meetingLink, recurrence, endDate } = req.body;

        // Verify course
        const courseDoc = await Course.findByPk(course);
        if (!courseDoc) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Verify professor owns the course
        if (req.user.role === 'professor' && courseDoc.professorId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const sessionsToCreate = [];
        const startDate = new Date(scheduledAt);
        let currentSessionDate = new Date(startDate);

        // Determine end date for loop
        let loopEndDate;
        if (recurrence && recurrence !== 'none' && endDate) {
            loopEndDate = new Date(endDate);
            // Set loop end date to end of day to include sessions on that day
            loopEndDate.setHours(23, 59, 59, 999);
        } else {
            loopEndDate = new Date(startDate); // Just one session
        }

        // Generate dates
        while (currentSessionDate <= loopEndDate) {
            sessionsToCreate.push({
                courseId: course,
                professorId: req.user.role === 'professor' ? req.user.id : courseDoc.professorId,
                title,
                description,
                scheduledAt: new Date(currentSessionDate), // Clone date
                duration,
                meetingLink
            });

            // Increment date based on recurrence
            if (recurrence === 'daily') {
                currentSessionDate.setDate(currentSessionDate.getDate() + 1);
            } else if (recurrence === 'weekly') {
                currentSessionDate.setDate(currentSessionDate.getDate() + 7);
            } else {
                break; // No recurrence, exit loop after first
            }
        }

        const createdSessions = await Session.bulkCreate(sessionsToCreate);

        res.status(201).json({ success: true, count: createdSessions.length, sessions: createdSessions });
    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/sessions/:id
// @desc    Update a session
// @access  Private (Professor/Admin)
router.put('/:id', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const session = await Session.findByPk(req.params.id);

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        // Verify professor owns the session
        if (req.user.role === 'professor' && session.professorId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await session.update(req.body);

        res.json({ success: true, session });
    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const session = await Session.findByPk(req.params.id);

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        await session.destroy();

        res.json({ success: true, message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
