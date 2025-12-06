// Professor Dashboard Logic
let currentUser = null;
let courses = [];
let assignments = [];
let sessions = [];
let messages = [];
let allStudents = [];
let allUsers = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = checkAuth();
  if (!currentUser || currentUser.role !== 'professor') {
    window.location.href = '/';
    return;
  }

  // Display user name
  document.getElementById('user-name').textContent = currentUser.name;

  // Set up navigation
  setupNavigation();

  // Load initial data
  await loadAllData();

  // Initialize theme
  initTheme();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.className = savedTheme === 'light' ? 'light-mode' : '';
  updateThemeIcon(savedTheme);
}

window.toggleTheme = function () {
  const isLight = document.body.classList.toggle('light-mode');
  const newTheme = isLight ? 'light' : 'dark';
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('.theme-icon');
  if (icon) {
    icon.className = theme === 'light' ? 'ri-moon-line theme-icon' : 'ri-sun-line theme-icon';
  }
}

// Setup navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionName = item.dataset.section;

      // Update active nav item
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update active section
      sections.forEach(section => section.classList.remove('active'));
      document.getElementById(`${sectionName}-section`).classList.add('active');

      // Update header
      updateHeader(sectionName);

      // Load section data
      loadSectionData(sectionName);
    });
  });
}

// Update header
function updateHeader(sectionName) {
  const titles = {
    overview: 'Dashboard Overview',
    courses: 'My Courses',
    assignments: 'Assignments',
    sessions: 'Class Sessions',
    classrooms: 'Online Classrooms',
    students: 'My Students',
    messages: 'Messages'
  };

  const subtitles = {
    overview: 'Manage your courses and students',
    courses: 'Create and manage your courses',
    assignments: 'Create and grade assignments',
    sessions: 'Schedule and manage class sessions',
    classrooms: 'Create and manage live online classrooms',
    students: 'View all students enrolled in your courses',
    messages: 'Communicate with your students'
  };

  const titleElement = document.getElementById('section-title');
  if (titleElement) titleElement.textContent = titles[sectionName] || sectionName;
}

// Load all data
async function loadAllData() {
  try {
    const [coursesRes, assignmentsRes, sessionsRes, messagesRes] = await Promise.all([
      api.getCourses(),
      api.getAssignments(),
      api.getSessions(),
      api.getMessages()
    ]);

    courses = coursesRes.courses || [];
    assignments = assignmentsRes.assignments || [];
    sessions = sessionsRes.sessions || [];
    messages = messagesRes.messages || [];

    // Get unique students from all courses
    allStudents = [];
    courses.forEach(course => {
      if (course.students) {
        course.students.forEach(student => {
          if (!allStudents.find(s => s.id === student.id)) {
            allStudents.push(student);
          }
        });
      }
    });

    renderOverview();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Load section data
async function loadSectionData(sectionName) {
  switch (sectionName) {
    case 'courses':
      renderCourses();
      break;
    case 'assignments':
      renderAssignments();
      break;
    case 'sessions':
      renderSessions();
      break;
    case 'classrooms':
      if (typeof loadClassrooms === 'function') {
        await loadClassrooms();
      }
      break;
    case 'students':
      renderStudents();
      break;
    case 'messages':
      renderMessages();
      break;
  }
}

// Render overview
function renderOverview() {
  document.getElementById('courses-count').textContent = courses.length;
  document.getElementById('students-count').textContent = allStudents.length;
  document.getElementById('assignments-count').textContent = assignments.length;

  const upcomingSessions = sessions.filter(s => new Date(s.scheduledAt) > new Date());
  document.getElementById('sessions-count').textContent = upcomingSessions.length;

  // Recent submissions
  const recentSubmissions = [];
  assignments.forEach(assignment => {
    if (assignment.submissions) {
      assignment.submissions.forEach(submission => {
        recentSubmissions.push({
          ...submission,
          assignmentTitle: assignment.title,
          courseName: assignment.course?.name
        });
      });
    }
  });

  recentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const recentSubmissionsEl = document.getElementById('recent-submissions');

  if (recentSubmissions.length) {
    recentSubmissionsEl.innerHTML = recentSubmissions.slice(0, 3).map(s => `
      <div class="assignment-item mb-2" style="padding: var(--spacing-sm);">
        <div class="item-title" style="font-size: 1rem;">${s.assignmentTitle}</div>
        <div class="item-footer">
          <span><i class="ri-book-open-line"></i> ${s.courseName || 'Course'}</span>
          <span>${s.grade ? `✅ Graded: ${s.grade}%` : '⏳ Pending review'}</span>
        </div>
      </div>
    `).join('');
  }

  // Upcoming sessions
  const upcomingSessionsEl = document.getElementById('upcoming-sessions-list');
  if (upcomingSessions.length) {
    upcomingSessionsEl.innerHTML = upcomingSessions.slice(0, 3).map(s => `
      <div class="session-item mb-2" style="padding: var(--spacing-sm);">
        <div class="item-title" style="font-size: 1rem;">${s.title}</div>
        <div class="item-footer">
          <span><i class="ri-book-open-line"></i> ${s.course?.name || 'Course'}</span>
          <span><i class="ri-time-line"></i> ${new Date(s.scheduledAt).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  }

  // Initialize Charts
  initializeCharts();
}

// Initialize Charts
function initializeCharts() {
  // Enrollment Chart
  const enrollmentCtx = document.getElementById('enrollmentChart')?.getContext('2d');
  if (enrollmentCtx) {
    const courseNames = courses.map(c => c.name);
    const studentCounts = courses.map(c => c.students?.length || 0);

    new Chart(enrollmentCtx, {
      type: 'bar',
      data: {
        labels: courseNames,
        datasets: [{
          label: 'Students Enrolled',
          data: studentCounts,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  // Assignment Completion Chart
  const assignmentCtx = document.getElementById('assignmentCompletionChart')?.getContext('2d');
  if (assignmentCtx) {
    // Calculate completion rates (mock logic for now as we don't have full submission data for all students)
    // We'll use the number of submissions vs total potential submissions (students * assignments)
    const assignmentTitles = assignments.slice(0, 5).map(a => a.title.substring(0, 15) + '...');
    const submissionCounts = assignments.slice(0, 5).map(a => a.submissions?.length || 0);

    new Chart(assignmentCtx, {
      type: 'doughnut',
      data: {
        labels: assignmentTitles,
        datasets: [{
          data: submissionCounts,
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  // Attendance Chart (Mock Data for now as we don't have attendance records in this view)
  const attendanceCtx = document.getElementById('attendanceChart')?.getContext('2d');
  if (attendanceCtx) {
    new Chart(attendanceCtx, {
      type: 'line',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
        datasets: [{
          label: 'Average Attendance (%)',
          data: [85, 88, 82, 90, 87, 92],
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      }
    });
  }
}

// Render courses
function renderCourses() {
  const coursesEl = document.getElementById('courses-list');

  if (!courses.length) {
    coursesEl.innerHTML = '<p class="text-muted">No courses yet. Create your first course!</p>';
    return;
  }

  coursesEl.innerHTML = courses.map(course => `
    <div class="course-card">
      <div class="course-header">
        <h3 class="course-title">${course.name}</h3>
        <span class="badge ${course.isActive ? 'badge-success' : 'badge-warning'}">${course.isActive ? 'Active' : 'Inactive'}</span>
      </div>
      <p class="item-description">${course.description}</p>
      <div class="course-meta">
        <div class="meta-item"><i class="ri-group-line"></i> ${course.students?.length || 0} students</div>
        <div class="meta-item"><i class="ri-time-line"></i> ${course.duration}</div>
        <div class="meta-item"><i class="ri-calendar-line"></i> Started: ${new Date(course.startDate).toLocaleDateString()}</div>
      </div>
      <div class="mt-2">
        <button class="btn btn-secondary btn-sm" onclick="editCourse('${course.id}')">Edit</button>
      </div>
    </div>
  `).join('');
}

// Render assignments
function renderAssignments() {
  const assignmentsEl = document.getElementById('assignments-list');

  if (!assignments.length) {
    assignmentsEl.innerHTML = '<p class="text-muted">No assignments yet. Create your first assignment!</p>';
    return;
  }

  assignmentsEl.innerHTML = assignments.map(assignment => {
    const submissionsCount = assignment.submissions?.length || 0;
    const gradedCount = assignment.submissions?.filter(s => s.grade !== undefined).length || 0;

    return `
      <div class="assignment-item">
        <div class="item-header">
          <div>
            <div class="item-title">${assignment.title}</div>
            <div class="item-description">${assignment.description}</div>
          </div>
          <span class="badge badge-primary">${submissionsCount} submissions</span>
        </div>
        <div class="item-footer">
          <span><i class="ri-book-open-line"></i> ${assignment.course?.name || 'Course'}</span>
          <span><i class="ri-calendar-event-line"></i> Due: ${new Date(assignment.dueDate).toLocaleDateString()}</span>
          <span><i class="ri-trophy-line"></i> Max: ${assignment.maxScore}</span>
          <span><i class="ri-check-double-line"></i> Graded: ${gradedCount}/${submissionsCount}</span>
        </div>
        ${submissionsCount > 0 ?
        `<button class="btn btn-primary btn-sm mt-2" onclick="viewSubmissions('${assignment.id}')">View Submissions</button>` :
        ''
      }
      </div>
    `;
  }).join('');
}

// Render sessions
function renderSessions() {
  const sessionsEl = document.getElementById('sessions-list');

  if (!sessions.length) {
    sessionsEl.innerHTML = '<p class="text-muted">No sessions scheduled yet.</p>';
    return;
  }

  sessionsEl.innerHTML = sessions.map(session => {
    const isUpcoming = new Date(session.scheduledAt) > new Date();
    return `
      <div class="session-item">
        <div class="item-header">
          <div>
            <div class="item-title">${session.title}</div>
            <div class="item-description">${session.description || ''}</div>
          </div>
          <span class="badge ${isUpcoming ? 'badge-primary' : ''}">${session.status}</span>
        </div>
        <div class="item-footer">
          <span><i class="ri-book-open-line"></i> ${session.course?.name || 'Course'}</span>
          <span><i class="ri-group-line"></i> ${session.students?.length || 0} students</span>
          <span><i class="ri-time-line"></i> ${new Date(session.scheduledAt).toLocaleString()}</span>
          <span><i class="ri-timer-line"></i> ${session.duration} min</span>
        </div>
        <div class="mt-2">
          ${session.meetingLink ?
        `<a href="${session.meetingLink}" target="_blank" class="btn btn-success btn-sm">Join Meeting</a>` : ''
      }
          <button class="btn btn-secondary btn-sm" onclick="editSession('${session.id}')">Edit</button>
        </div>
      </div>
    `;
  }).join('');
}

// Render students
function renderStudents() {
  const studentsEl = document.getElementById('students-list');

  if (!allStudents.length) {
    studentsEl.innerHTML = '<p class="text-muted">No students enrolled yet.</p>';
    return;
  }

  studentsEl.innerHTML = allStudents.map(student => {
    const studentCourses = courses.filter(c => c.students?.some(s => s.id === student.id));

    return `
      <div class="student-card">
        <div class="student-info">
          <div class="student-avatar"><i class="ri-user-line" style="font-size: 1.5rem;"></i></div>
          <div>
            <div class="user-name">${student.name}</div>
            <div class="user-role">${student.email}</div>
            <div class="text-muted" style="font-size: 0.875rem;">
              Enrolled in: ${studentCourses.map(c => c.name).join(', ')}
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="messageStudent('${student.id}', '${student.name}')">Message</button>
      </div>
    `;
  }).join('');
}

// Render messages (Chat Interface)
async function renderMessages() {
  const messagesEl = document.getElementById('messages-list');

  // Create chat layout
  messagesEl.innerHTML = `
      <div class="chat-container">
      <div class="conversation-list" id="conversation-list" style="position: relative; overflow: hidden; display: flex; flex-direction: column;">
        <!-- Conversations will be loaded here -->
        <div class="conversations-scroll" style="flex: 1; overflow-y: auto; padding-bottom: 80px;">
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading...</div>
        </div>
        <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; gap: 10px; z-index: 10; padding-top: 10px;">
          <button class="btn btn-primary" onclick="startNewConversation()" style="flex: 1;">New Chat</button>
          <button class="btn btn-secondary" onclick="openCreateGroupModal()" style="flex: 1;">Create Group</button>
        </div>
      </div>
      <div class="chat-window" id="chat-window">
        <div class="empty-state">
          <i style="font-size: 3rem;">💬</i>
          <h3>Select a conversation</h3>
          <p>Choose a user or group from the left to start chatting</p>
          <p>Choose a user or group from the left to start chatting</p>
        </div>
      </div>
    </div>
      `;

  // Add event delegation for conversation clicks (on parent that doesn't get replaced)
  const conversationList = document.getElementById('conversation-list');
  if (conversationList) {
    conversationList.addEventListener('click', (e) => {
      const conversationItem = e.target.closest('.conversation-item');
      if (conversationItem) {
        const convId = conversationItem.getAttribute('data-conversation-id');
        const convName = conversationItem.getAttribute('data-conversation-name');
        if (convId && convName) {
          console.log('Conversation clicked:', convId, convName);
          loadChatHistory(convId, convName);
        }
      }
    });
  }

  await loadConversations();
}

// Chat Helper Functions

// Load conversations
async function loadConversations() {
  try {
    const response = await fetch('/api/messages/conversations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
    });
    const data = await response.json();

    if (data.success) {
      const conversationList = document.querySelector('.conversations-scroll');
      if (!conversationList) return;

      if (data.conversations.length === 0) {
        conversationList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No conversations yet</div>';
        return;
      }

      conversationList.innerHTML = data.conversations.map(conv => {
        // Handle both group (participants array) and direct (user object) types
        let otherParticipant = null;
        let name = 'Unknown User';

        if (conv.type === 'group') {
          name = conv.name;
        } else {
          // Direct message: try conv.user first, then participants array
          if (conv.user) {
            otherParticipant = conv.user;
            name = conv.user.name;
          } else if (conv.participants && conv.participants.length > 0) {
            otherParticipant = conv.participants.find(p => p.id !== currentUser.id);
            name = otherParticipant ? otherParticipant.name : 'Unknown User';
          }
        }

        const lastMessage = conv.lastMessage ? (conv.lastMessage.content.length > 30 ? conv.lastMessage.content.substring(0, 30) + '...' : conv.lastMessage.content) : 'No messages yet';
        const time = conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const unreadCount = conv.unreadCount || 0;

        return `
            <div class="conversation-item ${unreadCount > 0 ? 'unread' : ''}" data-conversation-id="${conv.conversationId || conv.id}" data-conversation-name="${name}">
              <div class="avatar">${name.charAt(0)}</div>
              <div class="conversation-info">
                <div class="conversation-header">
                  <span class="conversation-name">${name}</span>
                  <span class="conversation-time">${time}</span>
                </div>
                <div class="conversation-preview">${lastMessage}</div>
              </div>
              ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
            </div>
          `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
}

// Load chat history
async function loadChatHistory(conversationId, conversationName, isNewGroup = false) {
  const chatWindow = document.getElementById('chat-window');
  chatWindow.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-info">
          <h3>${conversationName}</h3>
        </div>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div style="text-align: center; padding: 20px;">Loading messages...</div>
      </div>
      <div class="chat-input-area">
        <form onsubmit="sendMessage(event, '${conversationId}')" style="display: flex; gap: 10px; width: 100%;">
          <input type="text" id="message-input" placeholder="Type a message..." autocomplete="off">
          <button type="button" class="btn btn-icon"><i class="ri-attachment-2"></i></button>
          <button type="submit" class="btn btn-primary btn-icon"><i class="ri-send-plane-fill"></i></button>
        </form>
      </div>
    `;

  try {
    const response = await fetch(`/api/messages/conversation/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
    });
    const data = await response.json();

    if (data.success) {
      const messagesContainer = document.getElementById('chat-messages');
      messagesContainer.innerHTML = '';

      // Group messages by date
      const groupedMessages = {};
      data.messages.forEach(msg => {
        const date = new Date(msg.createdAt).toLocaleDateString();
        if (!groupedMessages[date]) groupedMessages[date] = [];
        groupedMessages[date].push(msg);
      });

      Object.keys(groupedMessages).forEach(date => {
        messagesContainer.innerHTML += `<div class="date-divider"><span>${date}</span></div>`;
        groupedMessages[date].forEach(msg => {
          const isMe = msg.senderId === currentUser.id;
          messagesContainer.innerHTML += `
              <div class="message ${isMe ? 'sent' : 'received'}">
                <div class="message-content">
                  ${msg.content}
                  <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            `;
        });
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
  }

  // Refresh conversation list to update unread counts
  if (!isNewGroup) {
    loadConversations();
  }
}

// Send message
window.sendMessage = async function (e, conversationId) {
  e.preventDefault();
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content) return;

  // Optimistic UI update
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.innerHTML += `
      <div class="message sent">
        <div class="message-content">
          ${content}
          <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  input.value = '';

  try {
    await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')} `
      },
      body: JSON.stringify({ conversationId, content })
    });
    // Reload to confirm and get any system updates
    // loadChatHistory(conversationId, document.querySelector('.chat-header h3').textContent); 
    // Don't reload full history to keep it smooth, maybe just append if needed or rely on socket in future
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message');
  }
}

// Show create course modal
function showCreateCourse() {
  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Create New Course</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="createCourse(event)">
          <div class="form-group">
            <label>Course Name</label>
            <select id="course-name" required>
              <option value="">Select a course</option>
              <option value="Tableau">Tableau</option>
              <option value="Power BI">Power BI</option>
              <option value="SQL">SQL</option>
              <option value="Informatica">Informatica</option>
            </select>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="course-description" rows="3" required></textarea>
          </div>
          <div class="form-group">
            <label>Duration</label>
            <input type="text" id="course-duration" value="6 weeks" required>
          </div>
          <div class="form-group">
            <label>Syllabus (optional)</label>
            <textarea id="course-syllabus" rows="4"></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Course</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Create course
async function createCourse(e) {
  e.preventDefault();

  const courseData = {
    name: document.getElementById('course-name').value,
    description: document.getElementById('course-description').value,
    duration: document.getElementById('course-duration').value,
    syllabus: document.getElementById('course-syllabus').value
  };

  try {
    await api.createCourse(courseData);
    alert('Course created successfully!');
    closeModal();
    await loadAllData();
    renderCourses();
  } catch (error) {
    alert('Error creating course: ' + error.message);
  }
}

// Show create assignment modal
function showCreateAssignment() {
  if (!courses.length) {
    alert('Please create a course first before adding assignments.');
    return;
  }

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Create Assignment</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="createAssignment(event)">
          <div class="form-group">
            <label>Course</label>
            <select id="assignment-course" required>
              <option value="">Select a course</option>
              ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="assignment-title" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="assignment-description" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input type="datetime-local" id="assignment-due" required>
          </div>
          <div class="form-group">
            <label>Max Score</label>
            <input type="number" id="assignment-score" value="100" required>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Assignment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Create assignment
async function createAssignment(e) {
  e.preventDefault();

  const assignmentData = {
    course: document.getElementById('assignment-course').value,
    title: document.getElementById('assignment-title').value,
    description: document.getElementById('assignment-description').value,
    dueDate: document.getElementById('assignment-due').value,
    maxScore: parseInt(document.getElementById('assignment-score').value)
  };

  try {
    await api.createAssignment(assignmentData);
    alert('Assignment created successfully!');
    closeModal();
    await loadAllData();
    renderAssignments();
  } catch (error) {
    alert('Error creating assignment: ' + error.message);
  }
}

// Show schedule session modal
// Show schedule session modal
function showScheduleSession() {
  if (!courses.length) {
    alert('Please create a course first before scheduling sessions.');
    return;
  }

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Schedule Session</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="createSession(event)">
          <div class="form-group">
            <label>Course</label>
            <select id="session-course" required>
              <option value="">Select a course</option>
              ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="session-title" placeholder="e.g., Week 1: Introduction" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="session-description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Scheduled Date & Time (Start)</label>
            <input type="datetime-local" id="session-time" required>
          </div>
          
          <div class="form-row" style="display: flex; gap: 15px;">
            <div class="form-group" style="flex: 1;">
              <label>Recurrence</label>
              <select id="session-recurrence" onchange="toggleEndDate(this.value)">
                <option value="none">None (One-time)</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div class="form-group" id="end-date-group" style="flex: 1; display: none;">
              <label>End Date</label>
              <input type="date" id="session-end-date">
            </div>
          </div>

          <div class="form-group">
            <label>Duration (minutes)</label>
            <input type="number" id="session-duration" value="60" required>
          </div>
          <div class="form-group">
            <label>Meeting Link (optional)</label>
            <input type="url" id="session-link" placeholder="https://zoom.us/j/...">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Schedule Session</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Toggle End Date visibility
window.toggleEndDate = function (recurrence) {
  const endDateGroup = document.getElementById('end-date-group');
  const endDateInput = document.getElementById('session-end-date');

  if (recurrence === 'none') {
    endDateGroup.style.display = 'none';
    endDateInput.required = false;
  } else {
    endDateGroup.style.display = 'block';
    endDateInput.required = true;
  }
}

// Create session
async function createSession(e) {
  e.preventDefault();

  const sessionData = {
    course: document.getElementById('session-course').value,
    title: document.getElementById('session-title').value,
    description: document.getElementById('session-description').value,
    scheduledAt: document.getElementById('session-time').value,
    duration: parseInt(document.getElementById('session-duration').value),
    meetingLink: document.getElementById('session-link').value,
    recurrence: document.getElementById('session-recurrence').value,
    endDate: document.getElementById('session-end-date').value
  };

  try {
    await api.createSession(sessionData);
    alert('Session(s) scheduled successfully!');
    closeModal();
    await loadAllData();
    renderSessions();
  } catch (error) {
    alert('Error scheduling session: ' + error.message);
  }
}

// View submissions
function viewSubmissions(assignmentId) {
  const assignment = assignments.find(a => a.id === assignmentId);
  if (!assignment) return;

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 800px;">
        <div class="modal-header">
          <h2>Submissions: ${assignment.title}</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        ${assignment.submissions && assignment.submissions.length ?
      assignment.submissions.map(sub => `
            <div class="card mb-3">
              <h4>Student Submission</h4>
              <p><strong>Content:</strong> ${sub.content}</p>
              ${sub.fileUrl ? `<p><strong>File:</strong> <a href="${sub.fileUrl}" target="_blank">View File</a></p>` : ''}
              <p><strong>Submitted:</strong> ${new Date(sub.submittedAt).toLocaleString()}</p>
              ${sub.grade !== undefined ?
          `<p><strong>Grade:</strong> ${sub.grade}/${assignment.maxScore}</p>
                 <p><strong>Feedback:</strong> ${sub.feedback || 'No feedback'}</p>` :
          `<form onsubmit="gradeSubmission(event, '${assignment.id}', '${sub.id}')">
                   <div class="form-group">
                     <label>Grade (out of ${assignment.maxScore})</label>
                     <input type="number" id="grade-${sub._id}" min="0" max="${assignment.maxScore}" required>
                   </div>
                   <div class="form-group">
                     <label>Feedback</label>
                     <textarea id="feedback-${sub._id}" rows="3"></textarea>
                   </div>
                   <button type="submit" class="btn btn-primary btn-sm">Submit Grade</button>
                 </form>`
        }
            </div>
          `).join('') :
      '<p class="text-muted">No submissions yet.</p>'
    }
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Grade submission
async function gradeSubmission(e, assignmentId, submissionId) {
  e.preventDefault();

  const grade = parseInt(document.getElementById(`grade-${submissionId}`).value);
  const feedback = document.getElementById(`feedback-${submissionId}`).value;

  try {
    await api.gradeAssignment(assignmentId, submissionId, grade, feedback);
    alert('Submission graded successfully!');
    await loadAllData();
    renderAssignments();
    closeModal();
  } catch (error) {
    alert('Error grading submission: ' + error.message);
  }
}

// Message student
function messageStudent(studentId, studentName) {
  showComposeMessage(studentId, studentName);
}

// Show compose message modal
function showComposeMessage(receiverId = '', receiverName = '') {
  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Compose Message</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="sendMessage(event)">
          <div class="form-group">
            <label>To</label>
            ${receiverId ?
      `<input type="text" value="${receiverName}" readonly>
               <input type="hidden" id="message-receiver" value="${receiverId}">` :
      `<select id="message-receiver" required>
                 <option value="">Select a student</option>
                 ${allStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
               </select>`
    }
          </div>
          <div class="form-group">
            <label>Subject</label>
            <input type="text" id="message-subject" placeholder="Enter subject" required>
          </div>
          <div class="form-group">
            <label>Message</label>
            <textarea id="message-content" rows="6" placeholder="Type your message here..." required></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Send Message</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Send message
async function sendMessage(e) {
  e.preventDefault();

  const receiver = document.getElementById('message-receiver').value;
  const subject = document.getElementById('message-subject').value;
  const content = document.getElementById('message-content').value;

  try {
    await api.sendMessage(receiver, subject, content);
    alert('Message sent successfully!');
    closeModal();
    await loadAllData();
    renderMessages();
  } catch (error) {
    alert('Error sending message: ' + error.message);
  }
}

// Start new conversation modal
window.startNewConversation = async function () {
  // Ensure users are loaded
  if (!allUsers || allUsers.length === 0) {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
      });
      const data = await response.json();
      if (data.success) {
        allUsers = data.users;
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
      return;
    }
  }

  const users = allUsers.filter(u => u.id !== currentUser.id);

  // Group users
  const professors = users.filter(u => u.role === 'professor');
  const students = users.filter(u => u.role === 'student');
  const others = users.filter(u => u.role !== 'professor' && u.role !== 'student');

  // Group students by course (if available, otherwise just list)
  // Since we don't have full course enrollment data for all students here easily without extra calls,
  // we'll just list them alphabetically for now, or try to group if data exists.
  // For simplicity in Professor view, let's just list Students and Admins.

  // Build Options HTML
  let optionsHtml = '<option value="">Choose a user...</option>';

  // Admins/Others
  if (others.length > 0) {
    optionsHtml += '<optgroup label="Admins & Staff">';
    others.forEach(o => {
      optionsHtml += `< option value = "${o.id}" > ${o.name} (${o.role})</option > `;
    });
    optionsHtml += '</optgroup>';
  }

  // Students
  if (students.length > 0) {
    optionsHtml += '<optgroup label="Students">';
    students.forEach(s => {
      optionsHtml += `< option value = "${s.id}" > ${s.name}</option > `;
    });
    optionsHtml += '</optgroup>';
  }

  // Other Professors
  if (professors.length > 0) {
    optionsHtml += '<optgroup label="Other Professors">';
    professors.forEach(p => {
      optionsHtml += `< option value = "${p.id}" > ${p.name}</option > `;
    });
    optionsHtml += '</optgroup>';
  }

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Start New Conversation</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <div class="form-group">
          <label>Select User</label>
          <select id="new-chat-user" class="form-control" style="width: 100%; padding: 10px; margin-bottom: 15px;">
            <option value="">Choose a user...</option>
            ${optionsHtml}
          </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="initiateChat()">Start Chat</button>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

window.initiateChat = async function () {
  const select = document.getElementById('new-chat-user');
  const userId = select.value;
  const userName = select.options[select.selectedIndex].text;

  if (!userId) return;

  closeModal();

  try {
    // Fetch or create conversation to get the correct conversation ID
    const response = await fetch(`/api/messages/direct/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    if (data.success) {
      loadChatHistory(data.conversation.id, userName);
    } else {
      alert('Failed to start conversation: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error initiating chat:', error);
    alert('Failed to start conversation');
  }
}

window.openCreateGroupModal = async function () {
  // Ensure users are loaded
  if (!allUsers || allUsers.length === 0) {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        allUsers = data.users;
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
      return;
    }
  }

  const modalHtml = `
    <div class="modal" id="create-group-modal" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Create Group Chat</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <div class="modal-body">
          <form id="create-group-form" onsubmit="createGroup(event)">
            <div class="form-group">
              <label>Group Name</label>
              <input type="text" id="group-name" required placeholder="e.g., Project Team A">
            </div>
            <div class="form-group">
              <label>Select Participants</label>
              <div class="user-selection-list" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px;">
                ${allUsers.filter(u => u.id !== currentUser.id).map(user => `
                  <div class="user-checkbox-item" style="margin-bottom: 5px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                      <input type="checkbox" name="participants" value="${user.id}" style="margin-right: 10px;">
                      <span>${user.name} (${user.role})</span>
                    </label>
                  </div>
                `).join('')}
              </div>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Create Group</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modalHtml;
}

window.createGroup = async function (event) {
  event.preventDefault();
  const name = document.getElementById('group-name').value;
  const checkboxes = document.querySelectorAll('input[name="participants"]:checked');
  const participants = Array.from(checkboxes).map(cb => cb.value);

  if (participants.length === 0) {
    alert('Please select at least one participant');
    return;
  }

  try {
    const response = await fetch('/api/messages/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name, participants })
    });

    const data = await response.json();
    if (data.success) {
      closeModal();
      loadConversations();
      // Open the new group chat
      loadChatHistory(data.conversation.id, data.conversation.name, true);
    } else {
      alert(data.message || 'Failed to create group');
    }
  } catch (error) {
    console.error('Error creating group:', error);
    alert('An error occurred');
  }
}

// Placeholder functions
function editCourse(id) {
  alert('Edit course functionality - To be implemented');
}

function editSession(id) {
  alert('Edit session functionality - To be implemented');
}

// Close modal
function closeModal(event) {
  if (event) event.preventDefault();
  document.getElementById('modal-container').innerHTML = '';
}

// Start new conversation modal
window.startNewConversation = async function () {
  // Ensure users are loaded
  if (!allUsers || allUsers.length === 0) {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        allUsers = data.users;
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Failed to load users');
      return;
    }
  }

  const users = allUsers.filter(u => u.id !== currentUser.id);

  // Group users
  const professors = users.filter(u => u.role === 'professor');
  const admins = users.filter(u => u.role === 'admin');
  const students = users.filter(u => u.role === 'student');

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Start New Conversation</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <div class="form-group">
          <label>Select User</label>
          <select id="new-chat-user" class="form-control" style="width: 100%; padding: 10px; margin-bottom: 15px;">
            <option value="">Choose a user...</option>
            ${professors.length > 0 ? `<optgroup label="Professors">${professors.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>` : ''}
            ${admins.length > 0 ? `<optgroup label="Admins">${admins.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</optgroup>` : ''}
            ${students.length > 0 ? `<optgroup label="Students">${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</optgroup>` : ''}
          </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="initiateChat()">Start Chat</button>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

window.initiateChat = async function () {
  const select = document.getElementById('new-chat-user');
  const userId = select.value;
  const userName = select.options[select.selectedIndex].text;

  if (!userId) return;

  closeModal();

  try {
    // Fetch or create conversation to get the correct conversation ID
    const response = await fetch(`/api/messages/direct/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    if (data.success) {
      loadChatHistory(data.conversation.id, userName);
    } else {
      alert('Failed to start conversation: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error starting conversation:', error);
    alert('Failed to start conversation');
  }
}
// Global variable to store questions during creation
let currentQuizQuestions = [];

function showCreateAIQuiz() {
  const modalHtml = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 800px;">
        <div class="modal-header">
          <h2>Create AI Quiz</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <div class="modal-body">
          <!-- Step 1: Generate -->
          <div id="quiz-step-1">
              <div class="form-group">
                <label>Select Course</label>
                <select id="quiz-course" class="form-control">
                  ${courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Quiz Title</label>
                <input type="text" id="quiz-title" class="form-control" placeholder="e.g., Solar System Quiz">
              </div>
              <div class="form-group">
                <label>Topic</label>
                <input type="text" id="quiz-topic" class="form-control" placeholder="e.g., Planets, Space Travel">
              </div>
              <div class="form-group">
                <label>Number of Questions</label>
                <input type="number" id="quiz-count" class="form-control" value="5" min="1" max="20">
              </div>
              <button class="btn btn-primary btn-block" onclick="generateQuizQuestions()" id="generate-btn">
                <i class="ri-magic-line"></i> Generate Questions
              </button>
          </div>

          <!-- Step 2: Edit & Settings (Hidden initially) -->
          <div id="quiz-step-2" style="display: none;">
              <div class="tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #eee;">
                  <button class="btn btn-outline-primary active" onclick="switchQuizTab('questions')" style="flex: 1; padding: 12px; font-weight: 600;">Questions</button>
                  <button class="btn btn-outline-secondary" onclick="switchQuizTab('settings')" style="flex: 1; padding: 12px; font-weight: 600;">Settings</button>
              </div>

              <!-- Questions Tab -->
              <div id="quiz-tab-questions">
                  <div id="questions-container" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;"></div>
                  <button class="btn btn-sm btn-secondary" onclick="addManualQuestion()">+ Add Question</button>
              </div>

              <!-- Settings Tab -->
              <div id="quiz-tab-settings" style="display: none;">
                  <div class="form-group">
                    <label>Time Limit (minutes)</label>
                    <input type="number" id="quiz-time" class="form-control" value="30">
                  </div>
                  <div class="form-group">
                    <label>Passing Cutoff (%)</label>
                    <input type="number" id="quiz-cutoff" class="form-control" value="0" min="0" max="100">
                    <small class="text-muted">0 for no cutoff</small>
                  </div>
                  <div class="form-group">
                    <label>Stop Condition</label>
                    <div style="display: flex; gap: 20px; align-items: center; margin-top: 10px; background: var(--bg-tertiary); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <label style="flex: 1; display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; margin: 0; padding: 5px; color: var(--text-primary);">
                            <input type="radio" name="stop-condition" value="manual" checked onclick="toggleScheduleInput(false)" style="width: 20px; height: 20px; margin: 0;"> 
                            Manually Stop
                        </label>
                        <div style="width: 1px; height: 24px; background: var(--border-color);"></div>
                        <label style="flex: 1; display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; margin: 0; padding: 5px; color: var(--text-primary);">
                            <input type="radio" name="stop-condition" value="scheduled" onclick="toggleScheduleInput(true)" style="width: 20px; height: 20px; margin: 0;"> 
                            Schedule Close Time
                        </label>
                    </div>
                  </div>
                  <div class="form-group" id="schedule-input" style="display: none;">
                    <label>Close Quiz At</label>
                    <input type="datetime-local" id="quiz-close-date" class="form-control">
                  </div>
              </div>

              <div class="mt-4" style="display: flex; gap: 10px;">
                  <button class="btn btn-secondary" onclick="showQuizStep1()">Back</button>
                  <button class="btn btn-success" onclick="saveAIQuiz()">Save & Publish Quiz</button>
              </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modalHtml;
}

function switchQuizTab(tab) {
  document.getElementById('quiz-tab-questions').style.display = tab === 'questions' ? 'block' : 'none';
  document.getElementById('quiz-tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
  // Update button styles
  const btns = document.querySelectorAll('.tabs button');
  btns[0].className = tab === 'questions' ? 'btn btn-outline-primary active' : 'btn btn-outline-secondary';
  btns[1].className = tab === 'settings' ? 'btn btn-outline-primary active' : 'btn btn-outline-secondary';
}

function toggleScheduleInput(show) {
  document.getElementById('schedule-input').style.display = show ? 'block' : 'none';
}

function showQuizStep1() {
  document.getElementById('quiz-step-1').style.display = 'block';
  document.getElementById('quiz-step-2').style.display = 'none';
}

async function generateQuizQuestions() {
  const topic = document.getElementById('quiz-topic').value;
  const count = document.getElementById('quiz-count').value;
  const btn = document.getElementById('generate-btn');

  if (!topic) return alert('Please enter a topic');

  btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Generating...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/quizzes/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ topic, count })
    });

    const data = await response.json();
    if (data.success) {
      currentQuizQuestions = data.questions;
      renderEditableQuestions();
      document.getElementById('quiz-step-1').style.display = 'none';
      document.getElementById('quiz-step-2').style.display = 'block';
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    alert('Failed to generate quiz');
  } finally {
    btn.innerHTML = '<i class="ri-magic-line"></i> Generate Questions';
    btn.disabled = false;
  }
}

function renderEditableQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = currentQuizQuestions.map((q, i) => `
        <div class="card mb-3" style="padding: 15px; border: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>Question ${i + 1}</strong>
                <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${i})">Delete</button>
            </div>
            <input type="text" class="form-control mb-2" value="${q.question}" onchange="updateQuestion(${i}, 'question', this.value)">
            
            <div style="margin-left: 20px;">
                ${q.options.map((opt, optIndex) => `
                    <div style="display: flex; gap: 10px; margin-bottom: 5px; align-items: center;">
                        <input type="radio" name="correct-${i}" ${q.correct === optIndex ? 'checked' : ''} onchange="updateQuestion(${i}, 'correct', ${optIndex})">
                        <input type="text" class="form-control form-control-sm" value="${opt}" onchange="updateQuestionOption(${i}, ${optIndex}, this.value)">
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function updateQuestion(index, field, value) {
  currentQuizQuestions[index][field] = value;
}

function updateQuestionOption(qIndex, optIndex, value) {
  currentQuizQuestions[qIndex].options[optIndex] = value;
}

function deleteQuestion(index) {
  currentQuizQuestions.splice(index, 1);
  renderEditableQuestions();
}

function addManualQuestion() {
  currentQuizQuestions.push({
    id: Date.now(),
    question: "New Question",
    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
    correct: 0
  });
  renderEditableQuestions();
  // Scroll to bottom
  setTimeout(() => {
    const container = document.getElementById('questions-container');
    container.scrollTop = container.scrollHeight;
  }, 100);
}

async function saveAIQuiz() {
  const courseId = document.getElementById('quiz-course').value;
  const title = document.getElementById('quiz-title').value;
  const topic = document.getElementById('quiz-topic').value;
  const timeLimit = document.getElementById('quiz-time').value;
  const cutoffScore = document.getElementById('quiz-cutoff').value;

  const stopCondition = document.querySelector('input[name="stop-condition"]:checked').value;
  const isManualStop = stopCondition === 'manual';
  const closesAt = isManualStop ? null : document.getElementById('quiz-close-date').value;

  if (!title || !topic) return alert('Please enter title and topic');
  if (currentQuizQuestions.length === 0) return alert('No questions to save');

  try {
    const response = await fetch('/api/quizzes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        courseId,
        title,
        topic,
        questions: currentQuizQuestions,
        timeLimit,
        cutoffScore,
        isManualStop,
        closesAt
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Quiz created successfully!');
      closeModal();
      loadQuizzes(); // Refresh list
    } else {
      alert('Error saving quiz: ' + data.message);
    }
  } catch (error) {
    alert('Failed to save quiz: ' + error.message);
  }
}

// Load Quizzes
async function loadQuizzes() {
  const assignmentsSection = document.getElementById('assignments-section');
  if (!assignmentsSection) return;

  // Create or get quizzes container INSIDE assignments section
  let quizContainer = document.getElementById('quizzes-container');
  if (!quizContainer) {
    quizContainer = document.createElement('div');
    quizContainer.id = 'quizzes-container';
    quizContainer.className = 'mt-4';
    quizContainer.innerHTML = '<h3><i class="ri-questionnaire-line"></i> Quizzes</h3><div id="quizzes-list"></div>';
    assignmentsSection.appendChild(quizContainer);
  }

  let allQuizzes = [];
  for (const course of courses) {
    try {
      const res = await fetch(`/api/quizzes/course/${course.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        allQuizzes = [...allQuizzes, ...data.quizzes.map(q => ({ ...q, courseName: course.name }))];
      }
    } catch (e) { console.error(e); }
  }

  const list = document.getElementById('quizzes-list');
  if (allQuizzes.length === 0) {
    list.innerHTML = '<p class="text-muted">No quizzes created yet.</p>';
    return;
  }

  list.innerHTML = allQuizzes.map(q => {
    const isClosed = q.status === 'closed' || (q.closesAt && new Date(q.closesAt) < new Date());
    const statusBadge = isClosed
      ? '<span class="badge badge-danger">Closed</span>'
      : '<span class="badge badge-success">Active</span>';

    return `
      <div class="card mb-3" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; opacity: ${isClosed ? 0.7 : 1};">
          <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                  <h4 style="margin: 0;">${q.title}</h4>
                  ${statusBadge}
              </div>
              <small class="text-muted">${q.courseName} • ${q.questions.length} Questions • ${q.timeLimit} mins</small>
              ${q.cutoffScore > 0 ? `<br><small class="text-muted">Cutoff: ${q.cutoffScore}%</small>` : ''}
              ${q.closesAt ? `<br><small class="text-muted">Closes: ${new Date(q.closesAt).toLocaleString()}</small>` : ''}
          </div>
          <div style="display: flex; gap: 5px;">
                <div class="quiz-item-actions">
                  ${isClosed
        ? `<button class="btn btn-sm btn-success" onclick="activateQuiz(${q.id})">
                        <i class="ri-play-circle-line"></i> Activate
                      </button>`
        : `<button class="btn btn-sm btn-outline-danger" onclick="stopQuiz(${q.id})">
                        <i class="ri-stop-circle-line"></i> Stop
                      </button>`
      }
              </div>
              <button class="btn btn-sm btn-outline-primary" onclick="editQuiz(${q.id})">
                  <i class="ri-edit-line"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-primary" onclick="viewQuizResults(${q.id}, '${q.title}')">
                  <i class="ri-bar-chart-line"></i> Results
              </button>
              <button class="btn btn-sm btn-outline-secondary" onclick="copyLink('/student/quiz-player.html?id=${q.id}')">
                  <i class="ri-link"></i> Link
              </button>
          </div>
      </div>
  `}).join('');
}

// Updated Stop Quiz Function
async function stopQuiz(id) {
  if (!confirm('Are you sure you want to stop this quiz? Students will no longer be able to take it.')) return;

  try {
    const res = await fetch(`/api/quizzes/${id}/stop`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.success) {
      window.notify.success('Quiz stopped successfully');
      loadQuizzes();
    } else {
      window.notify.error('Error: ' + data.message);
    }
  } catch (e) {
    console.error('Stop quiz error:', e);
    window.notify.error('Failed to stop quiz. Please try again.');
  }
}

// Activate Quiz Function
async function activateQuiz(id) {
  if (!confirm('Are you sure you want to activate this quiz? Students will be able to take it again.')) return;

  try {
    const res = await fetch(`/api/quizzes/${id}/activate`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.success) {
      window.notify.success('Quiz activated successfully');
      loadQuizzes();
    } else {
      window.notify.error('Error: ' + data.message);
    }
  } catch (e) {
    console.error('Activate quiz error:', e);
    window.notify.error('Failed to activate quiz. Please try again.');
  }
}

// Updated Copy Link Function
function copyLink(path) {
  const url = window.location.origin + path;

  // Try modern API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      window.notify.success('Link copied to clipboard!');
    }).catch(err => {
      console.error('Clipboard API failed:', err);
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Ensure it's not visible but part of DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      window.notify.success('Link copied to clipboard!');
    } else {
      prompt('Copy this link:', text);
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    prompt('Copy this link:', text);
  }
}

async function editQuiz(id) {
  try {
    const res = await fetch(`/api/quizzes/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();

    if (data.success) {
      const quiz = data.quiz;

      // Populate global variable
      currentQuizQuestions = quiz.questions;

      // Show modal (reuse create modal but populate it)
      showCreateAIQuiz();

      // Wait for modal to render then populate fields
      setTimeout(() => {
        document.getElementById('quiz-course').value = quiz.courseId;
        document.getElementById('quiz-title').value = quiz.title;
        document.getElementById('quiz-topic').value = quiz.topic;
        document.getElementById('quiz-count').value = quiz.questions.length;

        // Switch to step 2 directly
        document.getElementById('quiz-step-1').style.display = 'none';
        document.getElementById('quiz-step-2').style.display = 'block';

        // Populate settings
        document.getElementById('quiz-time').value = quiz.timeLimit;
        document.getElementById('quiz-cutoff').value = quiz.cutoffScore || 0;

        if (quiz.closesAt) {
          document.querySelector('input[name="stop-condition"][value="scheduled"]').checked = true;
          toggleScheduleInput(true);
          // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
          const date = new Date(quiz.closesAt);
          const dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          document.getElementById('quiz-close-date').value = dateString;
        } else {
          document.querySelector('input[name="stop-condition"][value="manual"]').checked = true;
          toggleScheduleInput(false);
        }

        renderEditableQuestions();

        // Change save button to update
        const saveBtn = document.querySelector('#quiz-step-2 .btn-success');
        saveBtn.textContent = 'Update Quiz';
        saveBtn.onclick = () => updateQuiz(id);
      }, 100);
    }
  } catch (e) {
    console.error(e);
    alert('Failed to load quiz details');
  }
}

async function updateQuiz(id) {
  const courseId = document.getElementById('quiz-course').value;
  const title = document.getElementById('quiz-title').value;
  const topic = document.getElementById('quiz-topic').value;
  const timeLimit = document.getElementById('quiz-time').value;
  const cutoffScore = document.getElementById('quiz-cutoff').value;

  const stopCondition = document.querySelector('input[name="stop-condition"]:checked').value;
  const isManualStop = stopCondition === 'manual';
  const closesAt = isManualStop ? null : document.getElementById('quiz-close-date').value;

  if (!title || !topic) return alert('Please enter title and topic');
  if (currentQuizQuestions.length === 0) return alert('No questions to save');

  try {
    const response = await fetch(`/api/quizzes/${id}`, { // Assuming PUT endpoint exists or we create it
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        courseId,
        title,
        topic,
        questions: currentQuizQuestions,
        timeLimit,
        cutoffScore,
        isManualStop,
        closesAt
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('Quiz updated successfully!');
      closeModal();
      loadQuizzes();
    } else {
      alert('Error updating quiz: ' + data.message);
    }
  } catch (error) {
    alert('Failed to update quiz: ' + error.message);
  }
}

async function viewQuizResults(quizId, title) {
  try {
    const response = await fetch(`/api/quizzes/${quizId}/results`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    if (data.success) {
      const modal = `
                <div class="modal" onclick="closeModal(event)">
                    <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2>Results: ${title}</h2>
                            <button class="modal-close" onclick="closeModal(event)">×</button>
                        </div>
                        <div class="modal-body">
                            ${data.submissions.length ? `
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid #eee;">
                                            <th style="padding: 10px; text-align: left;">Student</th>
                                            <th style="padding: 10px; text-align: left;">Score</th>
                                            <th style="padding: 10px; text-align: left;">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.submissions.map(s => `
                                            <tr style="border-bottom: 1px solid #eee;">
                                                <td style="padding: 10px;">${s.student.name}</td>
                                                <td style="padding: 10px;">
                                                    <span class="badge ${s.score / s.totalQuestions >= 0.5 ? 'badge-success' : 'badge-danger'}">
                                                        ${s.score} / ${s.totalQuestions}
                                                    </span>
                                                </td>
                                                <td style="padding: 10px;">${new Date(s.submittedAt).toLocaleDateString()}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<p>No submissions yet.</p>'}
                        </div>
                    </div>
                </div>
            `;
      document.getElementById('modal-container').innerHTML = modal;
    }
  } catch (error) {
    alert('Failed to load results');
  }
}

// Call loadQuizzes on init
// We'll append it to the existing init logic or just call it here if we can't easily hook into init
// For now, let's just expose it and call it when the dashboard loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadQuizzes, 1000); // Small delay to ensure courses are loaded
});
