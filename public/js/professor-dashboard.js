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
  // Create Visual Console for User Debugging
  createVisualConsole();

  // Connect global error handler to visual console
  window.onerror = function (msg, url, line) {
    console.error(`Global Error: ${msg} at ${line}`);
    return false;
  };

  currentUser = checkAuth();
  console.log('DEBUG: Auth check result:', currentUser);

  if (!currentUser || currentUser.role !== 'professor') {
    console.error('DEBUG: Auth failed or invalid role:', currentUser);
    window.location.href = '/';
    return;
  }

  // Display user name
  const userNameEl = document.getElementById('user-name');
  if (userNameEl) {
    userNameEl.textContent = currentUser.name;
  } else {
    console.warn('DEBUG: #user-name element not found');
  }

  // Set up navigation
  setupNavigation();

  // Initialize theme
  initTheme();

  // Sidebar Toggle Logic
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const body = document.body;

  window.toggleGlobalSidebar = function () {
    if (sidebar) {
      sidebar.classList.toggle('expanded');
      body.classList.toggle('sidebar-expanded');
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', window.toggleGlobalSidebar);
  }

  // Theme Toggle Logic
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', window.toggleTheme);
  }

  try {
    console.log('DEBUG: Starting connection check...');
    const isConnected = await checkConnection();
    console.log('DEBUG: Connection check result:', isConnected);

    if (!isConnected) {
      console.error('CRITICAL: Backend connection failed');
      alert('Cannot connect to server. Please check your internet connection or try again later.');
    }

    console.log('DEBUG: Starting loadAllData...');
    await loadAllData();
    console.log('DEBUG: loadAllData completed');
  } catch (error) {
    console.error('CRITICAL: Error during dashboard initialization:', error);
  }

  // Setup UI event listeners
});

async function checkConnection() {
  try {
    const response = await fetch('/api/health'); // Assuming a health endpoint exists, or use auth check
    // If no health endpoint, we can use a lightweight call or just assume true if fetch doesn't throw network error
    // But let's try a simple fetch to the API root or a known safe endpoint
    const testRes = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return testRes.ok || testRes.status === 401; // 401 means connected but maybe auth issue, which is different from network fail
  } catch (err) {
    console.error('DEBUG: Connection check failed:', err);
    return false;
  }
}


async function loadAllData() {
  console.log('DEBUG: Inside loadAllData');
  try {
    await Promise.all([
      loadDashboardStats(),
      // The original loadAllData called api.getCourses(), api.getAssignments(), etc.
      // The new structure implies separate load functions for these.
      // Assuming these are placeholders for future implementation or are handled by loadDashboardStats for overview.
      // Keeping the original data loading for courses, assignments, sessions, messages for now,
      // as the instruction only provided loadDashboardStats and not replacements for these.
      // If loadCourses, loadAssignments, etc. are new functions, they would need to be defined.
      // For now, I'll keep the original data fetching logic for these arrays.
      (async () => {
        const coursesRes = await api.getCourses();
        courses = coursesRes.courses || [];
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
      })(),
      (async () => {
        const assignmentsRes = await api.getAssignments();
        assignments = assignmentsRes.assignments || [];
      })(),
      (async () => {
        const sessionsRes = await api.getSessions();
        sessions = sessionsRes.sessions || [];
      })(),
      (async () => {
        const messagesRes = await api.getMessages();
        messages = messagesRes.messages || [];
      })()
    ]);
    // The original code called renderOverview() here.
    // The new structure implies updateDashboardUI handles the overview.
    // If renderOverview() is still needed for other parts, it would be called elsewhere.
    // For now, I'll assume updateDashboardUI replaces its overview functionality.
  } catch (err) {
    console.error('DEBUG: One or more load functions failed in loadAllData', err);
  }
}

async function loadDashboardStats() {
  console.log('DEBUG: Fetching dashboard stats...');
  try {
    const response = await fetch('/api/analytics/professor', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    console.log('DEBUG: Stats API status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('DEBUG: Dashboard stats data:', data);

    if (data.success) {
      updateDashboardUI(data.stats);
    } else {
      console.error('DEBUG: Failed to load stats:', data.message);
    }
  } catch (error) {
    console.error('DEBUG: Error loading dashboard stats:', error);
  }
}

function updateDashboardUI(stats) {
  console.log('DEBUG: Updating UI with stats:', stats);
  // Safe update helper
  const safelyUpdate = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value || 0;
    } else {
      console.warn(`DEBUG: Element #${id} not found for stat update`);
    }
  };

  safelyUpdate('courses-count', stats.totalCourses); // Changed from 'total-courses' to 'courses-count' to match existing HTML IDs
  safelyUpdate('students-count', stats.totalStudents); // Changed from 'total-students' to 'students-count'
  safelyUpdate('assignments-count', stats.activeAssignments); // Changed from 'active-assignments' to 'assignments-count'
  safelyUpdate('sessions-count', stats.scheduledSessions); // Changed from 'scheduled-sessions' to 'sessions-count'
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

window.toggleTheme = function () {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', newTheme);
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
      const targetSection = document.getElementById(`${sectionName}-section`);
      if (targetSection) {
        targetSection.classList.add('active');
      }

      // Update header
      // updateHeader(sectionName); // Remove this call to avoid double header
      const titleElement = document.getElementById('section-title');
      if (titleElement) {
        if (sectionName === 'messages') {
          // For messages, we might want to hide the main title if the chat UI has its own
          // or just set it to 'Messages'
          titleElement.textContent = 'Messages';
          // actually, the dashboard might have a top header outside sections. 
          // If the chat layout includes a sidebar with "Messages" H2, we might not need the main H2.
        } else {
          const titles = {
            overview: 'Dashboard Overview',
            courses: 'My Courses',
            assignments: 'Assignments',
            sessions: 'Class Sessions',
            classrooms: 'Online Classrooms',
            students: 'My Students',
            messages: 'Messages', // This remains
            'study-buddy': 'AI Assistant'
          };
          titleElement.textContent = titles[sectionName] || sectionName;
        }
      }

      // Special handling for Study Buddy section
      if (sectionName === 'study-buddy') {
        if (!window.studyBuddySection) {
          window.studyBuddySection = new StudyBuddySection();
        }
        setTimeout(() => {
          window.studyBuddySection.init();
        }, 100);
      }

      // Load section data
      loadSectionData(sectionName);

      // On mobile/tablet, collapse sidebar after selection
      if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        const body = document.body;
        if (sidebar) sidebar.classList.remove('expanded');
        if (body) body.classList.remove('sidebar-expanded');
      }
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
  console.log('DEBUG: renderMessages() called');
  // The HTML structure is already in dashboard.html, so we just need to load conversations
  // No need to dynamically create the layout
  try {
    await loadConversations();
    console.log('DEBUG: loadConversations() completed in renderMessages');
  } catch (error) {
    console.error('ERROR in renderMessages calling loadConversations:', error);
  }

  // Toggle Details Pane
  window.toggleDetails = function () {
    const pane = document.getElementById('chat-details-pane');
    if (pane) {
      pane.classList.toggle('open');
    }
  }
}

// Update Details Content
async function updateDetailsPane(name, id, userDetails = {}, isGroup = false, groupData = null) {
  const pane = document.getElementById('chat-details-pane');
  if (!pane) return;

  // Determine if current user is admin/creator
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'professor');
  const isCreator = groupData && currentUser && groupData.createdBy === currentUser.id;
  const canEdit = isGroup && (isAdmin || isCreator);

  if (isGroup && groupData) {
    // GROUP CHAT DETAILS
    pane.innerHTML = `
      <div class="profile-card" style="text-align: center; padding: 24px 0;">
        <div style="position: relative; display: inline-block;">
          <div id="group-icon" style="width: 90px; height: 90px; border-radius: 50%; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex; align-items: center; justify-content: center; 
            color: white; font-weight: bold; font-size: 36px; margin: 0 auto 16px;">
            ${name.charAt(0).toUpperCase()}
          </div>
          ${canEdit ? `
            <button onclick="changeGroupIcon(${id})" 
              style="position: absolute; bottom: 12px; right: -10px; width: 32px; height: 32px; 
              border-radius: 50%; background: #006064; color: white; border: 2px solid white; 
              cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <i class="ri-camera-line"></i>
            </button>
          ` : ''}
        </div>
        
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
          <h3 id="group-name-display" style="margin: 0; font-size: 1.2rem; color: #111827;">${name}</h3>
          ${canEdit ? `
            <button onclick="editGroupName(${id})" 
              style="background: none; border: none; color: #6b7280; cursor: pointer; padding: 4px;">
              <i class="ri-pencil-line"></i>
            </button>
          ` : ''}
        </div>
        <p style="color: #6b7280; font-size: 0.85rem; margin-top: 4px;">
          ${groupData.participants ? groupData.participants.length : 0} participants
        </p>
      </div>

      <!-- Activity Log Section -->
      <div class="detail-section">
        <div class="detail-title"><i class="ri-time-line"></i> Activity</div>
        <div id="group-activity" style="font-size: 0.85rem; color: #6b7280;">
          ${groupData.createdBy ? `
            <div style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
              <i class="ri-group-line" style="color: #10b981;"></i>
              <strong>${groupData.creatorName || 'Someone'}</strong> created this group
              <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">
                ${groupData.createdAt ? new Date(groupData.createdAt).toLocaleString() : 'Recently'}
              </div>
            </div>
          ` : ''}
          ${groupData.participants && groupData.participants.length > 0 ? groupData.participants.map(p => `
            <div style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
              <i class="ri-user-add-line" style="color: #3b82f6;"></i>
              <strong>${p.addedBy || groupData.creatorName || 'Admin'}</strong> added 
              <strong>${p.name}</strong>
              <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 2px;">
                ${p.joinedAt ? new Date(p.joinedAt).toLocaleString() : 'Recently'}
              </div>
            </div>
          `).join('') : ''}
        </div>
      </div>

      <!-- Participants Section -->
      <div class="detail-section">
        <div class="detail-title"><i class="ri-group-line"></i> Participants (${groupData.participants ? groupData.participants.length : 0})</div>
        <div id="group-participants">
          ${groupData.participants && groupData.participants.length > 0 ? groupData.participants.map(p => `
            <div style="display: flex; align-items: center; padding: 8px 0; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex; align-items: center; justify-content: center; 
                color: white; font-weight: 600; font-size: 14px;">
                ${p.name.charAt(0).toUpperCase()}
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 0.9rem;">${p.name}</div>
                <div style="fontSize: 0.75rem; color: #6b7280; text-transform: capitalize;">
                  ${p.role || 'Member'}${p.id === groupData.createdBy ? ' • Creator' : ''}
                </div>
              </div>
            </div>
          `).join('') : '<p style="color: #9ca3af; font-size: 0.85rem;">No participants</p>'}
        </div>
      </div>

      <!-- Starred Messages Section -->
      <div class="detail-section">
        <div class="detail-title"><i class="ri-star-line"></i> Starred Messages</div>
        <div id="starred-messages" style="font-size: 0.85rem; color: #6b7280;">
          <p style="color: #9ca3af;">No starred messages yet</p>
        </div>
      </div>

      <!-- Media Section -->
      <div class="detail-section">
        <div class="detail-title"><i class="ri-image-line"></i> Media & Files</div>
        <div id="shared-media">
          <div class="media-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <div class="media-item" style="aspect-ratio: 1; background: #f3f4f6; border-radius: 8px; 
              display: flex; align-items: center; justify-content: center; color: #9ca3af;">
              <i class="ri-image-line" style="font-size: 24px;"></i>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 0.85rem; margin-top: 12px; text-align: center;">
            No media shared yet
          </p>
        </div>
      </div>

      <!-- Group Settings (for admin/creator) -->
      ${canEdit ? `
        <div class="detail-section">
          <div class="detail-title"><i class="ri-settings-3-line"></i> Group Settings</div>
          <button onclick="manageGroupSettings(${id})" 
            style="width: 100%; padding: 12px; background: #f3f4f6; border: none; 
            border-radius: 8px; cursor: pointer; color: #374151; font-weight: 500;">
            <i class="ri-settings-line"></i> Manage Group
          </button>
        </div>
      ` : ''}
    `;
  } else {
    // INDIVIDUAL USER CHAT DETAILS - Modern UI
    // Extract user details for display
    const avatar = userDetails.avatar || '/images/avatar-placeholder.png';
    const bio = userDetails.bio || 'No bio available.';
    const phone = userDetails.phone || 'N/A';
    const email = userDetails.email || 'N/A';

    pane.innerHTML = `
        <div style="position: relative; height: 100%; overflow-y: auto;">
            <!-- Close Button -->
            <button onclick="toggleDetailsPane()" style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.05); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.05)'">
                <i class="ri-close-line" style="font-size: 20px;"></i>
            </button>
           
            <!-- Profile Card -->
            <div style="text-align: center; padding: 30px 20px 25px;">
                <div style="width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 15px; overflow: hidden; border: 3px solid var(--primary-color); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${name}">
                </div>
                <h3 style="margin: 0 0 5px; font-size: 1.3rem; font-weight: 600; color: var(--text-primary);">${name}</h3>
                <div style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; background: rgba(16, 185, 129, 0.1); border-radius: 20px; color: #10b981; font-size: 0.85rem; font-weight: 500;">
                    <i class="ri-checkbox-blank-circle-fill" style="font-size: 8px;"></i> Online
                </div>
            </div>

            <!-- About Section -->
            <div style="background: var(--bg-secondary, #f8f9fa); margin: 0 15px 15px; padding: 20px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <i class="ri-information-line" style="color: var(--primary-color); font-size: 18px;"></i>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">ABOUT</h4>
                </div>
                <p style="margin: 0 0 15px; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); font-style: italic;">
                    "${bio}"
                </p>
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid rgba(0,0,0,0.06);">
                    <i class="ri-phone-line" style="color: var(--primary-color); font-size: 16px;"></i>
                    <span style="font-size: 0.9rem; color: var(--text-secondary);">${phone}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px 0;">
                    <i class="ri-mail-line" style="color: var(--primary-color); font-size: 16px;"></i>
                    <span style="font-size: 0.9rem; color: var(--text-secondary); word-break: break-all;">${email}</span>
                </div>
            </div>

            <!-- Settings Section -->
            <div style="margin: 0 15px 15px; padding: 20px; background: var(--bg-secondary, #f8f9fa); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <i class="ri-settings-3-line" style="color: var(--primary-color); font-size: 18px;"></i>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">SETTINGS</h4>
                </div>
                
                <!-- Notifications Toggle -->
                <div id="notification-setting" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: white; border-radius: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
                            <i class="ri-notification-3-line" style="color: white; font-size: 18px;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">Notifications</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Message alerts</div>
                        </div>
                    </div>
                    <div class="toggle-switch-ios active" id="notification-toggle"></div>
                </div>

                <!-- Starred Messages -->
                <div id="starred-setting" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: white; border-radius: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center;">
                            <i class="ri-star-line" style="color: white; font-size: 18px;"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">Starred Messages</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">View saved messages</div>
                        </div>
                    </div>
                    <i class="ri-arrow-right-s-line" style="color: var(--text-muted); font-size: 20px;"></i>
                </div>
            </div>
            
            <!-- Recent Media Section -->
            <div style="margin: 0 15px 20px; padding: 20px; background: var(--bg-secondary, #f8f9fa); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                    <i class="ri-image-line" style="color: var(--primary-color); font-size: 18px;"></i>
                    <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">RECENT MEDIA</h4>
                </div>
                <div id="recent-media-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; min-height: 100px;">
                    <p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 30px 10px; margin: 0; font-size: 0.9rem;">
                        <i class="ri-image-add-line" style="font-size: 32px; display: block; margin-bottom: 8px; opacity: 0.3;"></i>
                        No media shared yet
                    </p>
                </div>
            </div>
        </div>
    `;

    // Attach event listeners AFTER HTML is inserted
    setTimeout(() => {
      const notifSetting = document.getElementById('notification-setting');
      if (notifSetting) {
        notifSetting.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleConversationNotifications();
        });
        notifSetting.addEventListener('mouseenter', function () {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        notifSetting.addEventListener('mouseleave', function () {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        });
      }

      const starredSetting = document.getElementById('starred-setting');
      if (starredSetting) {
        starredSetting.addEventListener('click', function (e) {
          e.stopPropagation();
          showStarredMessages();
        });
        starredSetting.addEventListener('mouseenter', function () {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });
        starredSetting.addEventListener('mouseleave', function () {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        });
      }

      loadNotificationState();
      loadRecentMedia();
    }, 100);
  }
}

// Load conversations
async function loadConversations() {
  try {
    console.log('DEBUG: Fetching conversations...');
    const response = await fetch('/api/messages/conversations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    console.log('DEBUG: Conversations data:', data);

    if (data.success) {
      const conversationList = document.getElementById('conversation-list');
      if (!conversationList) return;

      // Ensure currentUser is defined, if not try to get it
      if (!currentUser) {
        try {
          const userRes = await api.getCurrentUser();
          if (userRes && userRes.success) currentUser = userRes.user;
        } catch (e) { console.error('Error getting current user in loadConversations', e); }
      }

      // Filter out AI assistant conversations
      const filteredConversations = data.conversations.filter(conv => {
        let otherId = null;
        if (conv.user && conv.user.id) {
          otherId = conv.user.id;
        } else if (conv.participants) {
          // Safety check for currentUser
          const myId = currentUser ? currentUser.id : null;
          const other = conv.participants.find(p => p.id !== myId);
          if (other) otherId = other.id;
        }
        // Check for both potential IDs used for AI
        return otherId !== 'ai-assistant' && otherId !== 'ai-user';
      });

      if (filteredConversations.length === 0) {
        conversationList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No conversations yet</div>';
        return;
      }

      conversationList.innerHTML = filteredConversations.map(conv => {
        let otherParticipant = null;
        let name = 'Unknown User';
        let avatar = '/images/avatar-placeholder.png'; // Default

        if (conv.type === 'group') {
          name = conv.name || 'Group Chat';
          avatar = conv.avatar || '/images/group-placeholder.png';
        } else {
          // Direct chat logic
          if (conv.user) {
            otherParticipant = conv.user;
            name = conv.user.name || 'Unknown';
            if (conv.user.avatar) avatar = conv.user.avatar;
          } else if (conv.participants && conv.participants.length > 0) {
            const myId = currentUser ? currentUser.id : null;
            otherParticipant = conv.participants.find(p => p.id !== myId);
            if (otherParticipant) {
              name = otherParticipant.name || 'Unknown';
              if (otherParticipant.avatar) avatar = otherParticipant.avatar;
            }
          }
        }

        const lastMessage = conv.lastMessage ? (conv.lastMessage.content.length > 30 ? conv.lastMessage.content.substring(0, 30) + '...' : conv.lastMessage.content) : 'No messages yet';
        const time = conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const unreadCount = conv.unreadCount || 0;

        // Get activity status for online indicator
        const activityStatus = conv.activityStatus || 'Never seen';
        const isOnline = activityStatus === 'Online';

        return `
            <div class="chat-item ${unreadCount > 0 ? 'unread' : ''}" data-conversation-id="${conv.conversationId || conv.id}" data-conversation-name="${name}" data-conversation-type="${conv.type}" data-activity-status="${activityStatus}">
              <div class="avatar-wrapper">
                 <img src="${avatar}" class="avatar-img" alt="${name}" onerror="this.src='/images/avatar-placeholder.png'">
                 ${isOnline ? `<div class="status-dot status-online" style="border-color: #fff;"></div>` : ''}
              </div>
              <div class="chat-info">
                <div class="chat-name-row">
                  <span class="chat-name">${name}</span>
                  <span class="chat-time">${time}</span>
                </div>
                <div class="chat-name-row">
                   <div class="chat-preview">${lastMessage}</div>
                   ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                </div>
              </div>
            </div>
      `;
      }).join('');

      // Add click listeners
      document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
          const convId = item.dataset.conversationId;
          const name = item.dataset.conversationName;
          const activityStatus = item.dataset.activityStatus || 'Never seen';

          // Mobile check
          const chatContainer = document.querySelector('.chat-container-modern');
          if (chatContainer && window.innerWidth <= 768) {
            chatContainer.classList.add('mobile-chat-active');
          }

          loadChatHistory(convId, name, activityStatus);
        });
      });
    } else {
      console.error('DEBUG: Conversations fetch failed', data);
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
  }
}

// Load chat history
// Load chat history
async function loadChatHistory(conversationId, conversationName, activityStatus = 'Never seen') {
  window.currentConversationId = conversationId;
  const chatWindow = document.getElementById('chat-window');

  // Update active state in sidebar
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.conversationId == conversationId) item.classList.add('active');
  });

  // Determine status color based on activity
  const isOnline = activityStatus === 'Online';
  const statusColor = isOnline ? '#10b981' : '#9ca3af';

  // 1. Update Header
  const chatHeader = document.getElementById('chat-header');
  if (chatHeader) {
    chatHeader.style.visibility = 'visible';
    const nameEl = document.getElementById('chat-header-name');
    const avatarEl = document.getElementById('chat-header-avatar');
    const statusEl = document.getElementById('chat-header-status');
    const statusDotEl = document.getElementById('chat-header-status-dot');

    if (nameEl) nameEl.textContent = conversationName;
    // Attempt to find conversation to get avatar? 
    // For now, placeholder or keep existing if not changed
    if (avatarEl) avatarEl.src = '/images/avatar-placeholder.png'; // Default

    // Update status text and color dynamically
    if (statusEl) {
      statusEl.textContent = activityStatus;
      statusEl.style.color = statusColor;
    }

    // Update status dot visibility
    if (statusDotEl) {
      if (isOnline) {
        statusDotEl.classList.add('status-online');
        statusDotEl.style.display = 'block';
      } else {
        statusDotEl.classList.remove('status-online');
        statusDotEl.style.display = 'none';
      }
    }

    // Ensure dropdown delete action uses correct ID
    const deleteBtn = document.querySelector('#chat-options-menu .dropdown-item.danger');
    if (deleteBtn) {
      deleteBtn.setAttribute('onclick', `deleteChatConversation('${conversationId}', '${conversationName}')`);
    }
  }

  // 2. Load Messages
  const messagesContainer = document.getElementById('messages-container');
  if (messagesContainer) {
    messagesContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading...</div>';
  }

  try {
    console.log(`DEBUG: Loading chat history for ${conversationId}`);
    const response = await fetch(`/api/messages/conversation/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('DEBUG: Chat history API status:', response.status);
    const data = await response.json();

    if (data.success && messagesContainer) {
      messagesContainer.innerHTML = '';
      if (data.messages.length === 0) {
        messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">No messages yet.</div>';
      } else {
        data.messages.forEach(msg => {
          const isMe = msg.sender && (msg.sender.id === currentUser.id || msg.senderId === currentUser.id);

          // Reply context
          let replyContext = '';
          if (msg.replyTo) {
            const replyText = msg.replyTo.content.substring(0, 50) + (msg.replyTo.content.length > 50 ? '...' : '');
            replyContext = `
      <div class="reply-context" >
                            <i class="ri-reply-line"></i>
                            <span class="reply-sender">${msg.replyTo.sender?.name || 'User'}</span>
                            <span class="reply-text">${replyText}</span>
                        </div>
      `;
          }

          messagesContainer.innerHTML += `
      <div class="msg-wrapper ${isMe ? 'sent' : 'received'}" data-msg - id="${msg.id}" >
        <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
          ${!isMe ? `<img src="${(msg.sender && msg.sender.avatar) ? msg.sender.avatar : '/images/avatar-placeholder.png'}" class="msg-avatar">` : ''}
          <div class="msg-bubble">
            ${msg.isStarred ? '<i class="ri-star-fill starred-indicator"></i>' : ''}
            ${replyContext}
            ${msg.content}
            <span class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <div class="msg-actions">
              <button class="msg-action-btn" onclick="toggleStar(${msg.id}, this)" title="Star">
                <i class="${msg.isStarred ? 'ri-star-fill' : 'ri-star-line'}"></i>
              </button>
              <button class="msg-action-btn" onclick="toggleEmojiPicker(${msg.id}, this)" title="React">
                <i class="ri-emotion-line"></i>
              </button>
              <button class="msg-action-btn" onclick="setReplyTo(${msg.id}, '${(msg.sender?.name || 'User').replace(/'/g, "\\'")}', '${msg.content.replace(/'/g, "\\'")}')" title="Reply">
              <i class="ri-reply-line"></i>
            </button>
          </div>
        </div>
                  </div>
      `;
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  } catch (e) {
    console.error('ERROR in loadChatHistory:', e);
    if (messagesContainer) messagesContainer.innerHTML = 'Error loading messages';
  }

  // 3. Update Details Pane - Fetch metadata for groups
  try {
    // Check if this is a group conversation
    const conversationItem = document.querySelector(`.chat-item[data-conversation-id="${conversationId}"]`);
    const isGroup = conversationItem && conversationItem.dataset.conversationType === 'group';

    if (isGroup) {
      // Fetch detailed group metadata
      const metadataResponse = await fetch(`/api/messages/conversation/${conversationId}/metadata`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const metadataData = await metadataResponse.json();

      if (metadataData.success) {
        await updateDetailsPane(
          conversationName,
          conversationId,
          {},
          true, // isGroup
          metadataData.conversation // groupData
        );
      } else {
        // Fallback to basic details
        await updateDetailsPane(conversationName, conversationId, {});
      }
    } else {
      // Direct chat - use basic details
      await updateDetailsPane(conversationName, conversationId, {
        avatar: '/images/avatar-placeholder.png',
        bio: 'User details...',
        phone: 'N/A',
        email: 'N/A'
      });
    }
  } catch (error) {
    console.error('ERROR updating details pane:', error);
    // Fallback to basic details
    await updateDetailsPane(conversationName, conversationId, {});
  }

  // 4. Show Footer
  const footer = document.getElementById('chat-footer');
  if (footer) footer.style.display = 'flex';
}
// Helper Functions for Modern Chat UI

// Send message
window.sendMessage = async function (conversationId) {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content) return;

  // Optimistic UI update - show message immediately
  const messagesContainer = document.getElementById('messages-container');

  // Remove empty state if present
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const tempMsgId = 'temp-' + Date.now();
  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add message to UI immediately
  messagesContainer.innerHTML += `
    <div class="msg-wrapper sent" data-msg-id="${tempMsgId}">
      <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
      <div class="msg-bubble">
        ${content}
        <span class="msg-time">${timeString}</span>
        <div class="msg-actions">
          <button class="msg-action-btn" onclick="toggleStar('${tempMsgId}', this)" title="Star">
            <i class="ri-star-line"></i>
          </button>
          <button class="msg-action-btn" onclick="toggleEmojiPicker('${tempMsgId}', this)" title="React">
            <i class="ri-emotion-line"></i>
          </button>
          <button class="msg-action-btn" onclick="setReplyTo('${tempMsgId}', 'You', '${content.replace(/'/g, "\\'").substring(0, 100)}')" title="Reply">
            <i class="ri-reply-line"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  // Clear input and scroll
  input.value = '';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: conversationId,
        content: content
      })
    });
    const data = await response.json();

    if (data.success) {
      // Update temp message with real ID
      const tempMsg = messagesContainer.querySelector(`[data-msg-id="${tempMsgId}"]`);
      if (tempMsg && data.message) {
        tempMsg.setAttribute('data-msg-id', data.message.id);
      }
    } else {
      // If failed, remove the optimistic message
      const tempMsg = messagesContainer.querySelector(`[data-msg-id="${tempMsgId}"]`);
      if (tempMsg) tempMsg.remove();
      console.error('Failed to send message:', data.message);
    }
  } catch (error) {
    // If error, remove the optimistic message
    const tempMsg = messagesContainer.querySelector(`[data-msg-id="${tempMsgId}"]`);
    if (tempMsg) tempMsg.remove();
    console.error("Error sending message", error);
  }
}

window.toggleSelectionMode = function (enable) {
  const wrappers = document.querySelectorAll('.msg-wrapper');
  const header = document.getElementById('selection-header');
  if (enable) {
    document.body.classList.add('selection-active');
    wrappers.forEach(w => w.classList.add('selection-mode'));
    if (header) header.classList.add('active');
    document.querySelectorAll('.btn-emoji').forEach(b => b.style.display = 'none');
  } else {
    document.body.classList.remove('selection-active');
    wrappers.forEach(w => w.classList.remove('selection-mode'));
    if (header) header.classList.remove('active');
    document.querySelectorAll('.msg-select-checkbox').forEach(cb => cb.checked = false);
    const countSpan = document.getElementById('selection-count');
    if (countSpan) countSpan.textContent = '0 Selected';
  }
}

window.updateSelectionCount = function () {
  const count = document.querySelectorAll('.msg-select-checkbox:checked').length;
  const countSpan = document.getElementById('selection-count');
  if (countSpan) countSpan.textContent = `${count} Selected`;
}

window.toggleSearch = function () {
  const bar = document.getElementById('chat-search-bar');
  if (bar) {
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) bar.querySelector('input').focus();
  }
}

window.searchInChat = function (query) {
  const term = query.toLowerCase();
  const bubbles = document.querySelectorAll('.msg-bubble');
  bubbles.forEach(bubble => {
    const text = bubble.textContent.toLowerCase();
    const wrapper = bubble.closest('.msg-wrapper');
    if (wrapper) {
      wrapper.style.display = text.includes(term) ? 'flex' : 'none';
    }
  });
}


window.toggleChatOptions = function (event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('chat-options-menu');
  if (menu) {
    menu.classList.toggle('show');
    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('show');
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}

window.startNewConversation = function () {
  alert("Function to start new conversation - implementing...");
}

window.openCreateGroupModal = function () {
  alert("Function to create group - implementing...");
}


window.toggleDetailsPane = function () {
  const pane = document.getElementById('chat-details-pane');
  const chatWindow = document.getElementById('chat-window');
  if (pane && chatWindow) {
    pane.classList.toggle('active');
    if (pane.classList.contains('active')) {
      chatWindow.style.marginRight = '300px';
      const activeItem = document.querySelector('.chat-item.active');
      if (activeItem) {
        const name = activeItem.dataset.conversationName;
        pane.innerHTML = `
      <div class="details-header" >
                   <h3>Details</h3>
                   <button class="btn-icon" onclick="toggleDetailsPane()"><i class="ri-close-line"></i></button>
                </div>
      <div class="details-content">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/images/avatar-placeholder.png" class="details-avatar">
            <h4>${name}</h4>
        </div>
        <div class="details-section">
          <p>User details and shared media will appear here.</p>
        </div>
      </div>
    `;
      }
    } else {
      chatWindow.style.marginRight = '0';
    }
  }
}

window.copySelectedMessages = function () {
  const checked = document.querySelectorAll('.msg-select-checkbox:checked');
  if (checked.length === 0) return alert('No messages selected');

  const texts = [];
  checked.forEach(cb => {
    const wrapper = cb.closest('.msg-wrapper');
    const bubble = wrapper.querySelector('.msg-bubble');
    // Filter out time and actions
    let text = bubble.firstChild.textContent.trim();
    texts.push(text);
  });

  navigator.clipboard.writeText(texts.join('\n\n')).then(() => {
    alert('Copied to clipboard');
    toggleSelectionMode(false);
  });
}

window.deleteSelectedMessages = function () {
  const checked = document.querySelectorAll('.msg-select-checkbox:checked');
  if (checked.length === 0) return alert('No messages selected');

  if (!confirm(`Delete ${checked.length} messages ? `)) return;

  checked.forEach(cb => {
    const wrapper = cb.closest('.msg-wrapper');
    wrapper.remove();
  });
  toggleSelectionMode(false);
}

// Mobile: Close chat and return to list
window.closeMobileChat = function () {
  const chatContainer = document.querySelector('.chat-container-modern');
  if (chatContainer) {
    chatContainer.classList.remove('mobile-chat-active');
  }
  // Also hide the chat window if we are not using the modern container class switching (fallback)
  const chatWindow = document.getElementById('chat-window');
  if (chatWindow && window.innerWidth <= 768) {
    // logic for mobile view might rely on CSS classes on a parent
  }
}

// Show create course modal
function showCreateCourse() {
  const modal = `
      <div class="modal" onclick="closeModal(event)" >
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
      <div class="modal" onclick="closeModal(event)" >
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
      <div class="modal" onclick="closeModal(event)" >
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
      <div class="modal" onclick="closeModal(event)" >
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

  const grade = parseInt(document.getElementById(`grade - ${submissionId} `).value);
  const feedback = document.getElementById(`feedback - ${submissionId} `).value;

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
      <div class="modal" onclick="closeModal(event)" >
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

// Send message (old modal-based function - kept for backwards compatibility)
async function sendModalMessage(e) {
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
      <div class="modal" onclick="closeModal(event)" >
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
    const response = await fetch(`/ api / messages / direct / ${userId} `, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
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
  console.log('DEBUG: openCreateGroupModal called');
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
        <div class="modal-content" style="max-width: 600px; width: 90%;">
          <div class="modal-header">
            <h2><i class="ri-group-line"></i> Create Group Chat</h2>
            <button class="modal-close" onclick="closeModal(event)">×</button>
          </div>
          <div class="modal-body">
            <form id="create-group-form" onsubmit="createGroup(event)">
              <div class="form-group">
                <label style="font-weight: 600; margin-bottom: 8px; display: block;">Group Name</label>
                <input type="text" id="group-name" required placeholder="e.g., Project Team A" 
                  style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
              </div>
              
              <div class="form-group" style="margin-top: 24px;">
                <label style="font-weight: 600; margin-bottom: 12px; display: block;">Select Participants</label>
                
                <!-- Search Box -->
                <div style="margin-bottom: 12px;">
                  <input type="text" id="participant-search" placeholder="Search participants..." 
                    onkeyup="filterParticipants()"
                    style="width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
                </div>
                
                <!-- Selected Count -->
                <div id="selected-count" style="margin-bottom: 12px; font-size: 13px; color: #6b7280;">
                  <i class="ri-user-add-line"></i> <span id="count-text">0 participants selected</span>
                </div>
                
                <!-- Participants List -->
                <div class="participants-grid" id="participants-list" 
                  style="max-height: 300px; overflow-y: auto; display: grid; grid-template-columns: 1fr; gap: 8px;">
                  ${allUsers.filter(u => u.id !== currentUser.id).map(user => `
                    <label class="participant-card" data-user-name="${user.name.toLowerCase()}" data-user-role="${user.role.toLowerCase()}"
                      style="display: flex; align-items: center; padding: 12px; border: 2px solid #e5e7eb; 
                      border-radius: 10px; cursor: pointer; transition: all 0.2s; background: #fff;">
                      <input type="checkbox" name="participants" value="${user.id}" 
                        onchange="updateSelectedCount()"
                        style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer; accent-color: #006064;">
                      
                      <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; 
                        font-size: 16px; margin-right: 12px; flex-shrink: 0;">
                        ${user.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; font-size: 14px; color: #111827; margin-bottom: 2px;">
                          ${user.name}
                        </div>
                        <div style="font-size: 12px; color: #6b7280; text-transform: capitalize;">
                          <i class="ri-${user.role === 'student' ? 'user' : user.role === 'professor' ? 'presentation' : 'shield'}-line"></i>
                          ${user.role}
                        </div>
                      </div>
                    </label>
                  `).join('')}
                </div>
              </div>
              
              <button type="submit" class="btn btn-primary btn-block" 
                style="margin-top: 20px; width: 100%; padding: 14px; background: #006064; color: white; 
                border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
                <i class="ri-group-line"></i> Create Group
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <style>
        .participant-card:hover {
          border-color: #006064 !important;
          background: #f0fdfa !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 96, 100, 0.1);
        }
        
        .participant-card input:checked + div + div {
          color: #006064;
        }
        
        .participant-card input:checked {
          transform: scale(1.1);
        }
        
        .participants-grid::-webkit-scrollbar {
          width: 6px;
        }
        
        .participants-grid::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .participants-grid::-webkit-scrollbar-thumb {
          background: #006064;
          border-radius: 10px;
        }
      </style>
      `;

  document.getElementById('modal-container').innerHTML = modalHtml;
  console.log('DEBUG: Modal HTML injected');

  // Initialize count
  updateSelectedCount();
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

// Helper function to filter participants
window.filterParticipants = function () {
  const searchTerm = document.getElementById('participant-search').value.toLowerCase();
  const cards = document.querySelectorAll('.participant-card');

  cards.forEach(card => {
    const userName = card.getAttribute('data-user-name');
    const userRole = card.getAttribute('data-user-role');
    const matches = userName.includes(searchTerm) || userRole.includes(searchTerm);
    card.style.display = matches ? 'flex' : 'none';
  });
}

// Helper function to update selected count
window.updateSelectedCount = function () {
  const checked = document.querySelectorAll('input[name="participants"]:checked').length;
  const countText = document.getElementById('count-text');
  if (countText) {
    countText.textContent = `${checked} participant${checked !== 1 ? 's' : ''} selected`;
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
  const admins = users.filter(u => u.role === 'admin');
  const students = users.filter(u => u.role === 'student');

  const modal = `
      <div class="modal" onclick="closeModal(event)" >
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
    const response = await fetch(`/ api / messages / direct / ${userId} `, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')} ` }
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
      <div class="modal" onclick="closeModal(event)" >
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
        'Authorization': `Bearer ${localStorage.getItem('token')} `
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
      <div class="card mb-3" style = "padding: 15px; border: 1px solid #eee;" >
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
        'Authorization': `Bearer ${localStorage.getItem('token')} `
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
    } catch (e) { console.error('ERROR loading quizzes for course:', course.name, course.id, e); }
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
      <div class="card mb-3" style = "padding: 15px; display: flex; justify-content: space-between; align-items: center; opacity: ${isClosed ? 0.7 : 1};" >
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
    const res = await fetch(`/ api / quizzes / ${id}/stop`, {
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
    console.error('ERROR in editQuiz:', e);
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

// --- Modern Chat Helpers (Appended) ---

window.setReplyTo = function (msgId, senderName, content) {
  const inputWrapper = document.querySelector('.input-wrapper');
  const existing = inputWrapper.querySelector('.reply-preview');
  if (existing) existing.remove();

  const preview = document.createElement('div');
  preview.className = 'reply-preview';
  preview.innerHTML = `
        <div style="font-size: 12px; color: var(--primary-color);">Replying to ${senderName}</div>
        <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${content}</div>
        <i class="ri-close-line" onclick="this.parentElement.remove(); window.currentReplyTo = null;" style="position: absolute; right: 5px; top: 5px; cursor: pointer;"></i>
    `;
  inputWrapper.insertBefore(preview, document.getElementById('messageInput'));
  window.currentReplyTo = msgId;
  document.getElementById('messageInput').focus();
}

window.toggleStar = function (msgId, btn) {
  const icon = btn.querySelector('i');
  const isStarred = icon.classList.contains('ri-star-fill');
  // Optimistic toggle
  if (isStarred) {
    icon.className = 'ri-star-line';
  } else {
    icon.className = 'ri-star-fill';
  }
  // In real app, send API request
  console.log('Toggle star for', msgId);
}

window.handleFileUpload = function (input) {
  if (input.files && input.files[0]) {
    alert("File selected: " + input.files[0].name + " (Upload feature pending backend)");
    // Reset to allow re-selecting same file
    input.value = '';
  }
}

window.toggleEmojiPicker = function (messageId, button) {
  // Close any existing picker
  const existingPicker = document.querySelector('.emoji-picker');
  if (existingPicker) existingPicker.remove();

  // Create emoji picker
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  picker.style.cssText = 'position: absolute; bottom: 100%; right: 0; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 50; display: flex; gap: 8px;';

  const emojis = ['❤️', '👍', '😊', '😂', '😮', '😢', '🔥', '🎉'];

  picker.innerHTML = emojis.map(emoji =>
    `<button class="emoji-btn" style="background:none; border:none; cursor:pointer; font-size: 1.25rem; padding: 4px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.backgroundColor='#f1f5f9'" onmouseout="this.style.backgroundColor='transparent'" onclick="addReaction(${messageId}, '${emoji}'); event.stopPropagation();">${emoji}</button>`
  ).join('');

  if (button.parentElement) button.parentElement.style.position = 'relative';
  button.parentElement.appendChild(picker);

  // Close picker when clicking outside
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!picker.contains(e.target) && e.target !== button && !button.contains(e.target)) {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
};

window.addReaction = function (messageId, emoji) {
  const wrapper = document.querySelector(`.msg-wrapper[data-msg-id="${messageId}"]`);
  if (!wrapper) return;

  const bubble = wrapper.querySelector('.msg-bubble');
  let reactions = bubble.querySelector('.msg-reactions');

  if (!reactions) {
    reactions = document.createElement('div');
    reactions.className = 'msg-reactions';
    reactions.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;';
    bubble.appendChild(reactions);
  }

  // Check if emoji already exists
  const existingReaction = Array.from(reactions.children).find(r => r.textContent.startsWith(emoji));
  if (existingReaction) {
    // Increment count
    const countSpan = existingReaction.querySelector('.reaction-count');
    if (countSpan) {
      const currentCount = parseInt(countSpan.textContent) || 1;
      countSpan.textContent = currentCount + 1;
    }
  } else {
    // Add new reaction
    const reaction = document.createElement('span');
    reaction.className = 'reaction-item';
    reaction.style.cssText = 'background: rgba(0,0,0,0.05); border-radius: 12px; padding: 2px 8px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; border: 1px solid transparent;';
    reaction.innerHTML = `${emoji} <span class="reaction-count" style="font-size: 0.75rem; opacity: 0.8;">1</span>`;
    reactions.appendChild(reaction);
  }

  // Close emoji picker
  const picker = document.querySelector('.emoji-picker');
  if (picker) picker.remove();
};

// --- Missing Chat Modals and Actions ---

window.startNewConversation = function () {
  // specific to professor: use allStudents
  const users = (typeof allStudents !== 'undefined' ? allStudents : []);

  // Simple list for now
  let optionsHtml = '<option value="">Choose a student...</option>';
  if (users.length > 0) {
    optionsHtml += '<optgroup label="Students">';
    users.forEach(u => {
      optionsHtml += `<option value="${u.id}">${u.name}</option>`;
    });
    optionsHtml += '</optgroup>';
  } else {
    optionsHtml += '<option disabled>No students found</option>';
  }

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Start New Conversation</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <div class="form-group">
          <label>Select Student</label>
          <select id="new-chat-user" class="form-control" style="width: 100%; padding: 10px; margin-bottom: 15px;">
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


window.deleteChatConversation = async function (conversationId, name) {
  if (!confirm(`Are you sure you want to delete the conversation with ${name}?`)) return;

  // Optimistic remove
  document.getElementById('chat-window').innerHTML = '<div class="empty-state"><h3>Select a conversation</h3></div>';
  loadConversations(); // refresh list

  // In real app, API call: DELETE /api/messages/conversation/:id
  console.log('Delete conversation', conversationId);
}

window.copySelectedMessages = function () {
  const checked = document.querySelectorAll('.msg-select-checkbox:checked');
  if (checked.length === 0) return alert('No messages selected');

  const texts = [];
  checked.forEach(cb => {
    const wrapper = cb.closest('.msg-wrapper');
    const bubble = wrapper.querySelector('.msg-bubble');
    texts.push(bubble.innerText.replace(/\d{1,2}:\d{2}\s?[AP]M/i, '').trim());
  });

  navigator.clipboard.writeText(texts.join('\n\n')).then(() => {
    alert('Copied to clipboard');
    toggleSelectionMode(false);
  }).catch(err => console.error('Failed to copy', err));
}

window.deleteSelectedMessages = async function () {
  const checked = document.querySelectorAll('.msg-select-checkbox:checked');
  if (checked.length === 0) return alert('No messages selected');

  if (!confirm(`Delete ${checked.length} messages?`)) return;

  checked.forEach(cb => {
    const wrapper = cb.closest('.msg-wrapper');
    wrapper.remove();
  });

  toggleSelectionMode(false);
}





function createVisualConsole() {
  const consoleDiv = document.createElement('div');
  consoleDiv.id = 'visual-console';
  consoleDiv.style.cssText = `
        position: fixed;
        bottom: 0;
        right: 0;
        width: 400px;
        height: 300px;
        background: rgba(0, 0, 0, 0.9);
        color: #00ff00;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        z-index: 9999;
        overflow-y: auto;
        border-top-left-radius: 8px;
        pointer-events: auto;
    `;

  const header = document.createElement('div');
  header.innerHTML = '<strong>Debug Console</strong> <button onclick="document.getElementById(\'visual-console\').remove()" style="float: right; background: red; color: white; border: none; cursor: pointer;">X</button>';
  header.style.borderBottom = '1px solid #333';
  header.style.marginBottom = '5px';
  consoleDiv.appendChild(header);

  const logContainer = document.createElement('div');
  logContainer.id = 'visual-console-logs';
  consoleDiv.appendChild(logContainer);

  document.body.appendChild(consoleDiv);

  // Override console methods to print to screen
  const originalLog = console.log;
  const originalError = console.error;

  function appendToVisual(type, args) {
    const msg = args.map(arg => {
      try {
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
      } catch (e) { return '[Circular]'; }
    }).join(' ');

    const line = document.createElement('div');
    line.style.borderBottom = '1px solid #222';
    line.style.padding = '2px 0';
    if (type === 'error') line.style.color = '#ff6b6b';

    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${msg}`;
    logContainer.appendChild(line);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;
  }

  console.log = function (...args) {
    originalLog.apply(console, args);
    appendToVisual('log', args);
  };

  console.error = function (...args) {
    originalError.apply(console, args);
    appendToVisual('error', args);
  };

  console.log("Visual Console Initialized");
}


// ==================== CHAT DETAILS FEATURES ====================

// Show Starred Messages Modal  
window.showStarredMessages = function () {
  if (!window.currentConversationId) {
    window.notify?.warning('Please select a conversation first');
    return;
  }

  // Filter by BOTH isStarred AND current conversationId
  const starredMsgs = messages.filter(m =>
    m.isStarred && m.conversationId === window.currentConversationId
  );

  console.log('⭐ Starred messages for conversation', window.currentConversationId, ':', starredMsgs.length);

  if (starredMsgs.length === 0) {
    window.notify?.info('No starred messages in this conversation');
    return;
  }

  const modalHtml = `
    <div class="modal" id="starred-messages-modal" style="display: flex;">
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2><i class="ri-star-fill" style="color: #fbbf24;"></i> Starred Messages</h2>
          <button class="modal-close" onclick="closeModal('starred-messages-modal')">×</button>
        </div>
        <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
          ${starredMsgs.map(msg => `
            <div class="starred-msg-item" onclick="jumpToMessage('${msg.id}')" style="padding: 15px; border-bottom: 1px solid var(--border-color); cursor: pointer; border-radius: 8px; margin-bottom: 10px; background: var(--bg-secondary);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <strong style="color: var(--primary-color);">${msg.sender?.name || 'User'}</strong>
                <span style="font-size: 0.85rem; color: var(--text-muted);">${new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <p style="margin: 0; color: var(--text-primary); word-wrap: break-word;">${msg.content}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modalHtml;
};

// Jump to message in chat
window.jumpToMessage = function (messageId) {
  closeModal('starred-messages-modal');
  const msgElement = document.querySelector(`.msg-wrapper[data-msg-id="${messageId}"]`);
  if (msgElement) {
    msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    msgElement.style.animation = 'highlight-pulse 1.5s ease';
  }
};

// Load Recent Media
window.loadRecentMedia = function () {
  if (!window.currentConversationId) {
    console.log('⚠️ No conversation selected, skipping media load');
    return;
  }

  console.log('🖼️ Loading recent media for conversation:', window.currentConversationId);
  console.log('📊 Total messages:', messages?.length || 0);

  const mediaMessages = messages.filter(m => {
    // Check for file attachments or image URLs in content
    const hasFile = m.fileUrl && (m.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i));
    const hasImageInContent = m.content && m.content.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/i);
    return hasFile || hasImageInContent;
  });

  console.log('🎨 Found media messages:', mediaMessages.length);

  const mediaGrid = document.getElementById('recent-media-container');
  if (!mediaGrid) {
    console.log('❌ Media grid container not found');
    return;
  }

  if (mediaMessages.length === 0) {
    mediaGrid.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 20px; font-size: 0.9rem;">No media shared yet</p>';
    return;
  }

  // Show max 6 media items
  const displayMedia = mediaMessages.slice(0, 6);
  const remainingCount = Math.max(0, mediaMessages.length - 6);

  mediaGrid.innerHTML = displayMedia.map((msg, idx) => {
    const mediaUrl = msg.fileUrl || '/images/avatar-placeholder.png';
    const isLast = idx === 5 && remainingCount > 0;

    return `
      <div class="media-item" onclick="viewFullMedia('${mediaUrl}')" style="background-image: url('${mediaUrl}'); cursor: pointer; position: relative; background-size: cover; background-position: center; border-radius: 12px; height: 100px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'">
        ${isLast ? `<div style="position: absolute; inset:0; background: rgba(0,0,0,0.7); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.4rem;">+${remainingCount}</div>` : ''}
      </div>
    `;
  }).join('');

  console.log('✅ Media grid populated with', displayMedia.length, 'items');
};

// View full media
window.viewFullMedia = function (mediaUrl) {
  const modalHtml = `
    <div class="modal" id="media-viewer-modal" style="display: flex;">
      <div class="modal-content" style="max-width: 900px; background: #000;">
        <div class="modal-header" style="background: rgba(0,0,0,0.8);">
          <h2 style="color: white;">Media Viewer</h2>
          <button class="modal-close" onclick="closeModal('media-viewer-modal')" style="color: white;">×</button>
        </div>
        <div class="modal-body" style="background: #000; display: flex; justify-content: center; align-items: center;">
          <img src="${mediaUrl}" style="max-width: 100%; max-height: 70vh; object-fit: contain;" />
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modalHtml;
};

// Toggle Notifications for current conversation
window.toggleConversationNotifications = function () {
  if (!window.currentConversationId) return;

  const key = `notifications_${window.currentConversationId}`;
  const currentState = localStorage.getItem(key) !== 'false'; // Default true
  const newState = !currentState;

  localStorage.setItem(key, String(newState));

  // Update toggle UI
  const toggle = document.querySelector('#chat-details-pane .toggle-switch-ios');
  if (toggle) {
    if (newState) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }

  window.notify?.success(newState ? 'Notifications enabled' : 'Notifications disabled');
};

// Load notification state when opening chat
window.loadNotificationState = function () {
  if (!window.currentConversationId) return;

  const key = `notifications_${window.currentConversationId}`;
  const isEnabled = localStorage.getItem(key) !== 'false'; // Default true

  const toggle = document.querySelector('#chat-details-pane .toggle-switch-ios');
  if (toggle) {
    if (isEnabled) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }
};
