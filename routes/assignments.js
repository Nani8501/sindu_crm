const express = require('express');
const router = express.Router();
const { Assignment, Submission, Course, User } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/assignments
// @desc    Get all assignments (filtered by role)
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let assignments;

        if (req.user.role === 'professor') {
            // Get assignments from professor's courses
            const courses = await Course.findAll({ where: { professorId: req.user.id } });
            const courseIds = courses.map(c => c.id);
            assignments = await Assignment.findAll({
                where: { courseId: courseIds },
                include: [
                    { association: 'course', attributes: ['id', 'name'] },
                    { association: 'submissions', include: [{ association: 'student', attributes: ['id', 'name'] }] }
                ]
            });
        } else if (req.user.role === 'student') {
            // Get assignments from enrolled courses
            const user = await User.findByPk(req.user.id, {
                include: [{ association: 'enrolledCourses' }]
            });
            const courseIds = user.enrolledCourses.map(c => c.id);
            assignments = await Assignment.findAll({
                where: { courseId: courseIds },
                include: [
                    { association: 'course', attributes: ['id', 'name'] },
                    { association: 'submissions', where: { studentId: req.user.id }, required: false }
                ]
            });
        } else {
            assignments = await Assignment.findAll({
                include: [{ association: 'course', attributes: ['id', 'name'] }]
            });
        }

        res.json({ success: true, count: assignments.length, assignments });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/assignments
// @desc    Create an assignment
// @access  Private (Professor/Admin)
router.post('/', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { course, title, description, dueDate, maxScore } = req.body;

        // Verify course exists and professor owns it
        const courseDoc = await Course.findByPk(course);
        if (!courseDoc) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        if (req.user.role === 'professor' && courseDoc.professorId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const assignment = await Assignment.create({
            courseId: course,
            title,
            description,
            dueDate,
            maxScore
        });

        res.status(201).json({ success: true, assignment });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/assignments/:id/submit
// @desc    Submit an assignment
// @access  Private (Student or Admin)
router.post('/:id/submit', protect, async (req, res) => {
    try {
        const { content, fileUrl, studentId } = req.body;

        const assignment = await Assignment.findByPk(req.params.id);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // Determine which student is submitting
        // If admin is sending studentId, use that, otherwise use logged-in user
        let submittingStudentId;
        if (req.user.role === 'admin' && studentId) {
            submittingStudentId = studentId;
        } else if (req.user.role === 'student') {
            submittingStudentId = req.user.id;
        } else {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Check if already submitted
        const existing = await Submission.findOne({
            where: {
                assignmentId: assignment.id,
                studentId: submittingStudentId
            }
        });

        if (existing) {
            return res.status(400).json({ success: false, message: 'Already submitted' });
        }

        const submission = await Submission.create({
            assignmentId: assignment.id,
            studentId: submittingStudentId,
            content,
            fileUrl: fileUrl || null
        });

        res.json({ success: true, message: 'Assignment submitted successfully', submission });
    } catch (error) {
        console.error('Submit assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/assignments/:assignmentId/grade/:submissionId
// @desc    Grade a submission
// @access  Private (Professor/Admin)
router.put('/:assignmentId/grade/:submissionId', protect, authorize('professor', 'admin'), async (req, res) => {
    try {
        const { grade, feedback } = req.body;

        const submission = await Submission.findByPk(req.params.submissionId);
        if (!submission) {
            return res.status(404).json({ success: false, message: 'Submission not found' });
        }

        await submission.update({ grade, feedback });

        res.json({ success: true, message: 'Submission graded successfully', submission });
    } catch (error) {
        console.error('Grade assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/assignments/:id
// @desc    Delete an assignment
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const assignment = await Assignment.findByPk(req.params.id);

        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        await assignment.destroy();

        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Delete assignment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
