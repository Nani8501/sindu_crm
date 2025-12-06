# Sindhu Software Training - CRM Dashboard

A comprehensive CRM dashboard system for managing students, professors, courses, and communications for Sindhu Software Training online coaching center.

## Features

### Separate Role-Based Dashboards

#### **Admin Dashboard**
- 📊 **System Overview** - View total students, professors, courses, and assignments
- 👥 **User Management** - View and manage all students and professors
- 📚 **Course Management** - Create and oversee all courses
- 📝 **Assignment Oversight** - View all assignments and submissions
- 🎥 **Session Management** - Monitor all scheduled sessions
- 💬 **Message Overview** - View all system communications

### Student Portal
- 📚 **Course Enrollment**: Browse and enroll in available courses
- 📝 **Assignment Submission**: Submit and track assignments
- 🎥 **Session Management**: View scheduled classes and join online sessions
- 💬 **Messaging**: Communicate with professors
- 📊 **Progress Tracking**: Monitor course progress and grades

### Professor Portal
- 📚 **Course Management**: Create and manage courses (Tableau, Power BI, SQL, Informatica)
- 📝 **Assignment Creation**: Create assignments and grade submissions
- 🎥 **Session Scheduling**: Schedule and manage online class sessions
- 👥 **Student Management**: View and communicate with enrolled students
- 💬 **Messaging**: Send messages to students
- 📊 **Analytics**: Track student progress and engagement

### Admin Portal
- Full administrative access to all features
- User management
- System oversight

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Frontend**: HTML, CSS, JavaScript
- **UI Design**: Custom premium design with glassmorphism and dark mode

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd /home/nani/Desktop/crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the MongoDB URI if needed (default: `mongodb://localhost:27017/sindhu-crm`)
   - Change the JWT secret for production use

4. **Install and start MongoDB**
   - Make sure MongoDB is installed and running on your system
   - Default connection: `mongodb://localhost:27017`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Default Admin Account

- **Email**: admin@sindhusoftwaretraining.in
- **Password**: admin123

*Change these credentials after first login!*

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course (Professor/Admin)
- `POST /api/courses/:id/enroll` - Enroll in course (Student)
- `PUT /api/courses/:id` - Update course (Professor/Admin)

### Assignments
- `GET /api/assignments` - Get assignments
- `POST /api/assignments` - Create assignment (Professor/Admin)
- `POST /api/assignments/:id/submit` - Submit assignment (Student)
- `PUT /api/assignments/:assignmentId/grade/:submissionId` - Grade assignment (Professor/Admin)

### Sessions
- `GET /api/sessions` - Get sessions
- `POST /api/sessions` - Schedule session (Professor/Admin)
- `PUT /api/sessions/:id` - Update session (Professor/Admin)

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id/read` - Mark message as read

## Available Courses

The system supports four main courses:
1. **Tableau** - Data visualization and analytics
2. **Power BI** - Business intelligence platform
3. **SQL** - Database management and queries
4. **Informatica** - Data integration platform

## Project Structure

```
/home/nani/Desktop/crm/
├── models/              # Database models
│   ├── User.js
│   ├── Course.js
│   ├── Assignment.js
│   ├── Message.js
│   └── Session.js
├── routes/              # API routes
│   ├── auth.js
│   ├── courses.js
│   ├── assignments.js
│   ├── messages.js
│   └── sessions.js
├── middleware/          # Express middleware
│   └── auth.js
├── public/              # Frontend files
│   ├── index.html      # Login page
│   ├── student/        # Student dashboard
│   ├── professor/      # Professor dashboard
│   ├── css/            # Stylesheets
│   └── js/             # JavaScript files
├── server.js            # Main server file
├── package.json         # Dependencies
└── .env                 # Environment variables

```

## Development

For development with auto-reload:
```bash
npm run dev
```

For production:
```bash
npm start
```

## Support

For issues or questions related to this CRM system, please contact:
- Website: https://sindhusoftwaretraining.in/
- Facebook: https://www.facebook.com/profile.php?id=61572638297826
- Instagram: https://www.instagram.com/sindhu_software_training

## License

ISC
