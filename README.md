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


## Latest Updates (v3.0) - Modern Chat Details UI 🎨

### 🌟 Major UI Redesign
Complete redesign of chat details pane across all dashboards (Student, Professor, Admin) with modern, polished interface.

#### **Modern Chat Details Panel**
- **Card-Based Layout**: Beautiful light gray background cards with rounded corners (16px radius) and subtle shadows
- **Gradient Icon Backgrounds**: 
  - 🔔 Notifications: Purple gradient (`#667eea` → `#764ba2`)
  - ⭐ Starred Messages: Pink gradient (`#f093fb` → `#f5576c`)
- **Improved Typography**: Better font sizes, weights, and spacing throughout
- **Hover Animations**: Cards lift up (`translateY(-2px)`) on hover with enhanced shadows
- **Centered Profile Section**: 
  - 90px circular avatar with 3px colored border
  - Green "Online" status badge with dot indicator
  - Clean, professional user info display

#### **New Interactive Features**

##### ⭐ Starred Messages
- Star important messages for quick access
- Click "Starred Messages" to view all starred messages in current conversation
- Modal viewer with sender name, timestamp, and message content
- Click any starred message to jump to it in chat (smooth scroll + highlight animation)
- Filters by current conversation only - changes when switching chats
- Works across all dashboards (Student, Professor, Admin)

##### 🖼️ Recent Media Viewer
- Automatically displays last 6 shared images in 3-column grid
- Hover to scale up (1.05x) with shadow enhancement
- Click thumbnail to view full-size image in modal viewer
- Shows "+N" overlay when more than 6 media items exist
- Smart detection of image file extensions (jpg, png, gif, webp, svg, bmp)
- Empty state with large image icon when no media shared

##### 🔔 Notification Toggle
- Per-conversation notification preferences
- iOS-style toggle switch with smooth animation
- Settings persist in localStorage across sessions
- Toast notifications on toggle ("Notifications enabled/disabled")
- Works independently for each conversation

##### 🚫 404 Error Page
- Beautiful gradient background (purple to violet)
- Animated floating ghost/robot/alien icons
- Bouncing "404" text with pulsing ghost emoji
- Glassmorphism suggestions card
- "Take Me Home" button with hover effects
- Fully responsive design

### 🎯 Technical Improvements
- **Event Delegation**: Proper event listeners attached after HTML insertion (100ms delay)
- **State Management**: Local messages array updates when starring messages
- **Modern CSS**: Using CSS custom properties, flexbox, and grid layouts
- **Smooth Transitions**: All interactions have 0.2s ease transitions
- **Responsive Design**: Mobile-friendly with proper spacing
- **Cache Busting**: Timestamp-based cache invalidation (`?t=timestamp`)

### 📁 Files Modified
- `public/js/student-dashboard.js` - Added modern UI + chat features
- `public/js/professor-dashboard.js` - Applied modern UI template
- `public/js/admin-dashboard.js` - Applied modern UI template
- `public/css/modern-chat.css` - Added highlight animations, hover effects
- `public/404.html` - New custom error page
- `public/student/dashboard.html` - Updated cache timestamp
- `public/professor/dashboard.html` - Updated cache timestamp
- `public/admin/dashboard.html` - Updated cache timestamp

### 🎨 UI Design Principles
- **Premium Feel**: Modern, polished design that wows users
- **Visual Hierarchy**: Clear section headers with icons
- **Interactive Feedback**: Hover effects on all clickable elements
- **Consistent Spacing**: 15-20px margins, 12-16px padding
- **Color Harmony**: Coordinated gradients and accent colors
- **Accessibility**: Good contrast ratios, readable font sizes

### 🔧 Developer Notes
- All functions attached to `window` object for global access
- Feature functions appended to end of dashboard JS files
- Event listeners use `setTimeout` to ensure DOM is ready
- LocalStorage keys formatted as `notifications_{conversationId}`
- Media detection uses regex for reliable file type checking

---

## Previous Updates (v2.0) - Real-time Notifications & Chat UI

### New Features
- **Real-time Notification Popups**: Instant alerts on Admin and Professor dashboards when students send messages.
- **Enhanced Chat Interface**: 
  - Premium "Teal Gradient" bubbles for sent messages.
  - Improved message bubble styling (border-radius, shadows).
  - High-contrast text for reply contexts.
- **Message Interactions**:
  - **Reply**: Click "Reply" to quote a message.
  - **Star**: Star important messages.
  - **React**: Add emoji reactions to messages.
- **Optimized Performance**:
  - Global state management for `currentConversationId` to prevent duplicate notifications.
  - Efficient socket event emission.

### Fixes
- Fixed "User" name display bug in reply context.
- Fixed Z-index issue preventing clicks on message actions (Star/Reply).
- Fixed 500 Error on Conversations API by syncing Sequelize models with Database schema.
- Added missing database columns: `added_by`, `created_by`, `icon_url`.
