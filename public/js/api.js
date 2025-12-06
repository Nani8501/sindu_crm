// API Client - Centralized HTTP request handler
const API_BASE_URL = '/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    // Get auth headers
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    // PUT request
    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Auth endpoints
    async login(email, password) {
        const data = await this.post('/auth/login', { email, password });
        if (data.success && data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async register(name, email, password, role, phone = '') {
        const data = await this.post('/auth/register', { name, email, password, role, phone });
        if (data.success && data.token) {
            this.setToken(data.token);
        }
        return data;
    }

    async getCurrentUser() {
        return this.get('/auth/me');
    }

    logout() {
        this.setToken(null);
        localStorage.clear();
        window.location.href = '/';
    }

    // Courses
    async getCourses() {
        return this.get('/courses');
    }

    async getCourse(id) {
        return this.get(`/courses/${id}`);
    }

    async createCourse(courseData) {
        return this.post('/courses', courseData);
    }

    async updateCourse(id, courseData) {
        return this.put(`/courses/${id}`, courseData);
    }

    async enrollInCourse(id) {
        return this.post(`/courses/${id}/enroll`, {});
    }

    // Assignments
    async getAssignments() {
        return this.get('/assignments');
    }

    async createAssignment(assignmentData) {
        return this.post('/assignments', assignmentData);
    }

    async submitAssignment(id, content, fileUrl = '') {
        return this.post(`/assignments/${id}/submit`, { content, fileUrl });
    }

    async gradeAssignment(assignmentId, submissionId, grade, feedback) {
        return this.put(`/assignments/${assignmentId}/grade/${submissionId}`, { grade, feedback });
    }

    // Messages
    async getMessages() {
        return this.get('/messages');
    }

    async sendMessage(receiver, subject, content) {
        return this.post('/messages', { receiver, subject, content });
    }

    async markMessageRead(id) {
        return this.put(`/messages/${id}/read`, {});
    }

    // Sessions
    async getSessions() {
        return this.get('/sessions');
    }

    async createSession(sessionData) {
        return this.post('/sessions', sessionData);
    }

    async updateSession(id, sessionData) {
        return this.put(`/sessions/${id}`, sessionData);
    }

    // Quizzes
    async getQuizzesByCourse(courseId) {
        return this.get(`/quizzes/course/${courseId}`);
    }

    async getQuiz(id) {
        return this.get(`/quizzes/${id}`);
    }
}

// Export singleton instance
// Export singleton instance
const api = new API();
window.api = api;
