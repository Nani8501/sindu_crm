const express = require('express');
const router = express.Router();
const { Attendance, User, Course, Session } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { generateUserId } = require('../utils/idGenerator');

// @route   GET /api/attendance
// @desc    Get attendance records (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let where = {};
        const { courseId, studentId, date, status, sessionId } = req.query;

        // Filter by role
        if (req.user.role === 'professor') {
            // Get courses taught by professor
            const courses = await Course.findAll({ where: { professorId: req.user.id } });
            const courseIds = courses.map(c => c.id);
            where.courseId = courseIds;
        } else if (req.user.role === 'student') {
            // Only show student's own attendance
            where.studentId = req.user.id;
        }

        // Apply additional filters
        if (courseId) where.courseId = courseId;
        if (studentId && req.user.role !== 'student') where.studentId = studentId;
        if (date) where.date = date;
        if (status) where.status = status;
        if (sessionId) where.sessionId = sessionId;

        const attendance = await Attendance.findAll({
            where,
            include: [
                { association: 'student', attributes: ['id', 'name', 'email'] },
                { association: 'course', attributes: ['id', 'name'] },
                { association: 'session', attributes: ['id', 'title'] },
                { association: 'marker', attributes: ['id', 'name', 'role'] }
            ],
            order: [['date', 'DESC']]
        });

        res.json({ success: true, count: attendance.length, attendance });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/attendance
// @desc    Mark attendance (single or bulk)
// @access  Private (Professor/Admin)
router.post('/', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { records } = req.body; // Array of attendance records

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'Records array is required' });
        }

        const createdRecords = [];

        for (const record of records) {
            const { studentId, courseId, sessionId, date, status, notes } = record;

            // Verify course access for professor
            if (req.user.role === 'professor') {
                const course = await Course.findByPk(courseId);
                if (!course || course.professorId !== req.user.id) {
                    continue; // Skip this record if professor doesn't own the course
                }
            }

            // Check if attendance already exists for this date
            const whereClause = {
                studentId,
                courseId,
                date: date || new Date().toISOString().split('T')[0]
            };
            if (sessionId) {
                whereClause.sessionId = sessionId;
            }
            const existing = await Attendance.findOne({ where: whereClause });

            if (existing) {
                // Update existing record
                await existing.update({
                    status: status || 'present',
                    sessionId: sessionId || null,
                    notes: notes || null,
                    markedBy: req.user.id
                });
                createdRecords.push(existing);
            } else {
                // Create new record
                const attendance = await Attendance.create({
                    id: generateUserId('attendance'),
                    studentId,
                    courseId,
                    sessionId: sessionId || null,
                    date: date || new Date().toISOString().split('T')[0],
                    status: status || 'present',
                    markedBy: req.user.id,
                    notes: notes || null
                });
                createdRecords.push(attendance);
            }
        }

        res.json({
            success: true,
            message: `Attendance marked for ${createdRecords.length} student(s)`,
            attendance: createdRecords
        });
    } catch (error) {
        console.error('Mark attendance error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Professor/Admin)
router.put('/:id', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { status, notes } = req.body;

        const attendance = await Attendance.findByPk(req.params.id);
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        // Verify course access for professor
        if (req.user.role === 'professor') {
            const course = await Course.findByPk(attendance.courseId);
            if (!course || course.professorId !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }
        }

        await attendance.update({
            status: status || attendance.status,
            notes: notes !== undefined ? notes : attendance.notes,
            markedBy: req.user.id
        });

        res.json({ success: true, message: 'Attendance updated', attendance });
    } catch (error) {
        console.error('Update attendance error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance record
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const attendance = await Attendance.findByPk(req.params.id);
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' });
        }

        await attendance.destroy();
        res.json({ success: true, message: 'Attendance record deleted' });
    } catch (error) {
        console.error('Delete attendance error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/attendance/stats/:studentId
// @desc    Get attendance statistics for a student
// @access  Private
router.get('/stats/:studentId', protect, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Authorization check
        if (req.user.role === 'student' && req.user.id !== studentId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const attendance = await Attendance.findAll({
            where: { studentId },
            include: [{ association: 'course', attributes: ['id', 'name'] }]
        });

        const stats = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'present').length,
            absent: attendance.filter(a => a.status === 'absent').length,
            late: attendance.filter(a => a.status === 'late').length,
            excused: attendance.filter(a => a.status === 'excused').length,
            percentage: attendance.length > 0
                ? ((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100).toFixed(2)
                : 0
        };

        res.json({ success: true, stats, records: attendance });
    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
