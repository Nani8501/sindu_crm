const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const EMAIL = 'prof@test.com';
const PASSWORD = 'password123';

async function testRecurrence() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token obtained.');

        // 2. Get Courses (to find a course ID)
        console.log('Fetching courses...');
        const coursesRes = await axios.get(`${API_URL}/courses`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        let courseId;
        if (coursesRes.data.courses.length > 0) {
            courseId = coursesRes.data.courses[0].id;
            console.log(`Using existing course ID: ${courseId}`);
        } else {
            // Create a course if none exist
            console.log('Creating a new course...');
            const createCourseRes = await axios.post(`${API_URL}/courses`, {
                name: 'Test Course for Recurrence',
                description: 'Testing recurring sessions',
                department: 'Computer Science'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            courseId = createCourseRes.data.course.id;
            console.log(`Created new course ID: ${courseId}`);
        }

        // 3. Create Recurring Sessions
        console.log('Creating recurring sessions...');
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 3); // 3 days from now

        const sessionData = {
            course: courseId,
            title: 'Daily Standup Test',
            description: 'Automated test for recurrence',
            scheduledAt: startDate.toISOString(),
            duration: 30,
            recurrence: 'daily',
            endDate: endDate.toISOString().split('T')[0] // YYYY-MM-DD
        };

        const createSessionRes = await axios.post(`${API_URL}/sessions`, sessionData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Session creation response:', createSessionRes.data);

        // 4. Verify Sessions
        console.log('Verifying created sessions...');
        const sessionsRes = await axios.get(`${API_URL}/sessions`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const createdSessions = sessionsRes.data.sessions.filter(s => s.title === 'Daily Standup Test');
        console.log(`Found ${createdSessions.length} sessions with title "Daily Standup Test".`);

        if (createdSessions.length >= 4) {
            console.log('SUCCESS: Recurring sessions created correctly.');
        } else {
            console.log('FAILURE: Incorrect number of sessions created.');
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testRecurrence();
