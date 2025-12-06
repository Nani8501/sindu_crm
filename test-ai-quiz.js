const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const EMAIL = 'prof@test.com';
const PASSWORD = 'password123';

async function testAIQuiz() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        // 2. Generate Quiz
        console.log('Generating AI Quiz on "Solar System"...');
        const genRes = await axios.post(`${API_URL}/quizzes/generate`, {
            topic: 'Solar System',
            count: 3
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (genRes.data.success) {
            console.log('SUCCESS: Quiz Generated!');
            console.log(JSON.stringify(genRes.data.questions, null, 2));
        } else {
            console.log('FAILURE: ' + genRes.data.message);
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testAIQuiz();
