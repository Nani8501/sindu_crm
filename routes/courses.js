const express = require('express');
const router = express.Router();
const { Course, User, CourseEnrollment } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all courses
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        console.log('📚 GET /api/courses - User:', req.user.id, 'Role:', req.user.role);

        let coursesQuery = {};

        // Filter based on role
        if (req.user.role === 'professor') {
            console.log('  → Professor query: filtering by professorId');
            coursesQuery.where = { professorId: req.user.id };
            coursesQuery.include = [
                { association: 'professor', attributes: ['id', 'name', 'email'] },
                { association: 'students', attributes: ['id', 'name', 'email'] }
            ];
        } else if (req.user.role === 'student') {
            console.log('  → Student query: filtering by enrollments for student', req.user.id);
            // For students: only return courses they're enrolled in (approved status)
            coursesQuery.include = [
                {
                    association: 'professor',
                    attributes: ['id', 'name', 'email']
                },
                {
                    association: 'students',
                    attributes: ['id', 'name', 'email'],
                    through: {
                        where: {
                            studentId: req.user.id,
                            status: 'approved'
                        }
                    },
                    required: true // INNER JOIN - only courses with this student enrolled
                }
            ];
        } else {
            console.log('  → Admin query: returning all courses');
            // Admin: return all courses
            coursesQuery.include = [
                { association: 'professor', attributes: ['id', 'name', 'email'] },
                { association: 'students', attributes: ['id', 'name', 'email'] }
            ];
        }

        const courses = await Course.findAll(coursesQuery);
        console.log('  ✅ Found', courses.length, 'courses');

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        console.error('  ❌ Get courses error:', error);
        console.error('  Stack:', error.stack);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/courses/enrollments/pending
// @desc    Get all pending course enrollments
// @access  Private (Admin only)
router.get('/enrollments/pending', protect, authorize('admin'), async (req, res) => {
    try {
        const pendingEnrollments = await CourseEnrollment.findAll({
            where: { status: 'pending' },
            include: [
                { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
                { model: Course, as: 'course', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            count: pendingEnrollments.length,
            enrollments: pendingEnrollments
        });
    } catch (error) {
        console.error('Get pending enrollments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [
                { association: 'professor', attributes: ['id', 'name', 'email', 'phone'] },
                { association: 'students', attributes: ['id', 'name', 'email'] }
            ]
        });

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/courses
// @desc    Create a course
// @access  Private (Admin/Professor)
router.post('/', protect, authorize('admin', 'professor'), async (req, res) => {
    try {
        const { name, description, duration, syllabus, startDate, endDate } = req.body;

        // If professor is creating, assign to themselves
        const professorId = req.user.role === 'professor' ? req.user.id : req.body.professorId;

        const course = await Course.create({
            name,
            description,
            professorId,
            duration,
            syllabus,
            startDate,
            endDate
        });

        res.status(201).json({ success: true, course });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course (students request, admin can approve directly)
// @access  Private (Student or Admin)
router.post('/:id/enroll', protect, async (req, res) => {
    try {
        console.log('Enroll request:', {
            userId: req.user.id,
            userRole: req.user.role,
            courseId: req.params.id,
            bodyStudentId: req.body.studentId
        });

        const course = await Course.findByPk(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Determine which student to enroll and enrollment status
        let studentIdToEnroll;
        let enrollmentStatus = 'pending'; // Default for student requests
        let approvedBy = null;

        if (req.user.role === 'admin' && req.body.studentId) {
            // Admin enrolling a specific student - auto-approve
            studentIdToEnroll = req.body.studentId;
            enrollmentStatus = 'approved';
            approvedBy = req.user.id;
            console.log('Admin enrolling student:', studentIdToEnroll);
        } else if (req.user.role === 'student') {
            // Student enrolling themselves - needs approval
            studentIdToEnroll = req.user.id;
            enrollmentStatus = 'pending';
            console.log('Student self-enrolling (pending approval):', studentIdToEnroll);
        } else if (req.user.role === 'admin' && !req.body.studentId) {
            // Admin enrolling themselves (shouldn't happen but allow it)
            studentIdToEnroll = req.user.id;
            enrollmentStatus = 'approved';
            approvedBy = req.user.id;
            console.log('Admin self-enrolling:', studentIdToEnroll);
        } else {
            console.log('403 - User role:', req.user.role, 'studentId in body:', req.body.studentId);
            return res.status(403).json({
                success: false,
                message: `Not authorized to enroll. Role: ${req.user.role}`
            });
        }

        // Check if already enrolled or pending
        const existing = await CourseEnrollment.findOne({
            where: {
                courseId: course.id,
                studentId: studentIdToEnroll
            }
        });

        if (existing) {
            if (existing.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Enrollment request already pending admin approval'
                });
            }
            return res.status(400).json({ success: false, message: 'Already enrolled in this course' });
        }

        // Create enrollment with status
        const enrollment = await CourseEnrollment.create({
            courseId: course.id,
            studentId: studentIdToEnroll,
            status: enrollmentStatus,
            approvedBy: approvedBy,
            approvalDate: enrollmentStatus === 'approved' ? new Date() : null
        });

        const message = enrollmentStatus === 'approved'
            ? 'Successfully enrolled in course'
            : 'Enrollment request submitted. Waiting for admin approval.';

        console.log('Enrollment created:', enrollmentStatus, 'for student:', studentIdToEnroll);
        res.json({ success: true, message, course, enrollment });
    } catch (error) {
        console.error('Enroll error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/courses/:courseId/enroll/:enrollmentId/approve
// @desc    Approve or reject enrollment request
// @access  Private (Admin only)
router.put('/:courseId/enroll/:enrollmentId/approve', protect, authorize('admin'), async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be either "approved" or "rejected"'
            });
        }

        const enrollment = await CourseEnrollment.findByPk(req.params.enrollmentId);

        if (!enrollment) {
            return res.status(404).json({ success: false, message: 'Enrollment not found' });
        }

        if (enrollment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Enrollment already ${enrollment.status}`
            });
        }

        await enrollment.update({
            status: status,
            approvedBy: req.user.id,
            approvalDate: new Date()
        });

        res.json({
            success: true,
            message: `Enrollment ${status}`,
            enrollment
        });
    } catch (error) {
        console.error('Approve enrollment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/courses/:id
// @desc    Update a course
// @access  Private (Admin/Professor who owns the course)
router.put('/:id', protect, authorize('admin', 'professor'), async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check if professor owns the course (unless admin)
        if (req.user.role === 'professor' && course.professorId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this course' });
        }

        await course.update(req.body);

        res.json({ success: true, course });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/courses/:id
// @desc    Delete a course
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        await course.destroy();

        res.json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
