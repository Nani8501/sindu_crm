const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from handshake and attaches user to socket
 */
module.exports = async (socket, next) => {
    try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'name', 'email', 'role']
        });

        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }

        // Attach user to socket
        socket.user = user;
        next();
    } catch (error) {
        console.error('Socket auth error:', error.message);
        next(new Error('Authentication error: Invalid token'));
    }
};
