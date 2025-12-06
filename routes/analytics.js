const express = require('express');
const router = express.Router();
const { sequelize, User, Course, CourseEnrollment, Assignment, Submission, Session, Attendance } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   GET /api/analytics/admin
// @desc    Get admin dashboard analytics
// @access  Private (Admin only)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
    try {
        // 1. Basic Counts
        const totalStudents = await User.count({ where: { role: 'student' } });
        const totalProfessors = await User.count({ where: { role: 'professor' } });
        const totalCourses = await Course.count();
        const totalAssignments = await Assignment.count();

        // 2. New Registrations (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newStudents = await User.count({
            where: {
                role: 'student',
                createdAt: { [Op.gte]: thirtyDaysAgo }
            }
        });

        // 3. Course Popularity (Top 5 by enrollment)
        const coursePopularity = await Course.findAll({
            attributes: [
                'id',
                'name',
                [
                    // Count associated students
                    require('sequelize').literal('(SELECT COUNT(*) FROM course_enrollments WHERE course_enrollments.course_id = Course.id)'),
                    'studentCount'
                ]
            ],
            order: [[require('sequelize').literal('studentCount'), 'DESC']],
            limit: 5
        });

        // 4. User Distribution
        const userDistribution = {
            students: totalStudents,
            professors: totalProfessors,
            admins: await User.count({ where: { role: 'admin' } })
        };

        // 5. Recent Activity (Last 5 enrollments)
        const recentEnrollments = await CourseEnrollment.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'student', attributes: ['id', 'name'] },
                { model: Course, as: 'course', attributes: ['id', 'name'] }
            ]
        });

        // 6. Top Performers (based on assignment grades)
        const topPerformers = await Submission.findAll({
            attributes: [
                'studentId',
                [sequelize.fn('AVG', sequelize.col('grade')), 'averageGrade'],
                [sequelize.fn('COUNT', sequelize.col('Submission.id')), 'submissionCount']
            ],
            include: [
                { model: User, as: 'student', attributes: ['id', 'name', 'email'] }
            ],
            group: ['studentId', 'student.id', 'student.name', 'student.email'],
            order: [[sequelize.fn('AVG', sequelize.col('grade')), 'DESC']],
            limit: 5
        });

        // Format top performers
        const formattedTopPerformers = topPerformers.map(p => ({
            id: p.student.id,
            name: p.student.name,
            email: p.student.email,
            averageGrade: parseFloat(p.getDataValue('averageGrade')).toFixed(1),
            submissionCount: p.getDataValue('submissionCount')
        }));

        // Format course popularity
        const formattedCoursePopularity = coursePopularity.map(c => ({
            name: c.name,
            studentCount: c.getDataValue('studentCount')
        }));

        res.json({
            success: true,
            counts: {
                students: totalStudents,
                professors: totalProfessors,
                courses: totalCourses,
                assignments: totalAssignments
            },
            newRegistrations: newStudents,
            coursePopularity: formattedCoursePopularity,
            userDistribution: {
                students: totalStudents,
                professors: totalProfessors,
                admins: userDistribution.admins
            },
            recentEnrollments: recentEnrollments,
            topPerformers: formattedTopPerformers
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
