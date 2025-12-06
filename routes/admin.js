const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { generateUserId } = require('../utils/idGenerator');

// @route   POST /api/admin/bootstrap
// @desc    Create initial admin account (protected by secret key)
// @access  Public (but requires secret key)
router.post('/bootstrap', async (req, res) => {
    try {
        const { name, email, password, secretKey } = req.body;

        // Validate secret key
        if (!secretKey || secretKey !== process.env.ADMIN_BOOTSTRAP_KEY) {
            return res.status(403).json({
                success: false,
                message: 'Invalid bootstrap key'
            });
        }

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: { role: 'admin' }
        });

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Admin account already exists. Use regular admin login.'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create admin user
        const adminId = generateUserId('admin');
        const admin = await User.create({
            id: adminId,
            role: 'admin',
            name,
            email,
            password // Will be hashed by beforeCreate hook
        });

        // Return without password
        const adminResponse = { ...admin.toJSON() };
        delete adminResponse.password;

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            user: adminResponse
        });
    } catch (error) {
        console.error('Bootstrap admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
});

module.exports = router;
