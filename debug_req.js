const axios = require('axios');
const { User } = require('./models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d'
    });
}

async function debugRequest() {
    try {
        // 1. Get a valid token for admin user
        const admin = await User.findOne({ where: { role: 'admin' } });
        if (!admin) throw new Error('Admin not found');

        const token = generateToken(admin.id);
        console.log(`Testing with user: ${admin.id}`);

        // 2. Make request to the failing endpoint
        try {
            const res = await axios.get('http://localhost:3000/api/messages/ai/conversations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Response Success:', res.data);
        } catch (apiError) {
            if (apiError.response) {
                console.log('API Error Status:', apiError.response.status);
                console.log('API Error Data:', apiError.response.data);
            } else {
                console.log('Network/Other Error:', apiError.message);
            }
        }

    } catch (error) {
        console.error('Setup Error:', error);
    }
}

debugRequest();
