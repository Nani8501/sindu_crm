const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authorization middleware for dashboard access
 * Validates that the requesting user has permission to view the dashboard
 */
async function dashboardAuth(req, res, next) {
    try {
        // Get user ID from query parameter (the dashboard being viewed)
        const targetUserId = req.params.userId || req.query.userId;

        // Get the currently logged-in user from token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized - No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findByPk(decoded.id);

        if (!currentUser) {
            return res.status(401).json({ success: false, message: 'Unauthorized - User not found' });
        }

        // Authorization logic
        const isAdmin = currentUser.role === 'admin';
        const isViewingSelf = currentUser.id === targetUserId;

        // Admin can view anyone's dashboard
        if (isAdmin) {
            req.currentUser = currentUser;
            req.targetUserId = targetUserId;
            req.viewerRole = 'admin';
            return next();
        }

        // User viewing their own dashboard
        if (isViewingSelf) {
            req.currentUser = currentUser;
            req.targetUserId = targetUserId;
            req.viewerRole = 'self';
            return next();
        }

        // Professor viewing student dashboard
        if (currentUser.role === 'professor') {
            // TODO: Check if student is enrolled in professor's course
            // For now, allow professors to view all students
            // This should be enhanced with actual course enrollment checking
            const targetUser = await User.findByPk(targetUserId);
            if (targetUser && targetUser.role === 'student') {
                req.currentUser = currentUser;
                req.targetUserId = targetUserId;
                req.viewerRole = 'professor';
                return next();
            }
        }

        // Unauthorized access
        return res.status(403).json({
            success: false,
            message: 'Forbidden - You do not have permission to view this dashboard'
        });

    } catch (error) {
        console.error('Dashboard auth error:', error);
        return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token' });
    }
}

module.exports = dashboardAuth;
