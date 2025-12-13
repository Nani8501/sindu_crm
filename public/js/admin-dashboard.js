// Notification Helper
const showNotification = (message, type = 'info') => {
  if (window.notify && window.notify[type]) {
    window.notify[type](message);
  } else {
    alert(message);
  }
};

// Admin Dashboard Logic
let currentUser = null;
let allUsers = [];
let courses = [];
let assignments = [];
let sessions = [];
let messages = [];
let currentFilter = 'all';

// Initialize dashboard
// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  if (!localStorage.getItem('token')) {
    window.location.href = '/login.html';
    return;
  }

  try {
    // Load user info first
    await loadUserInfo();

    if (!currentUser || currentUser.role !== 'admin') {
      window.location.href = '/';
      return;
    }

    // Display admin name
    document.getElementById('user-name').textContent = currentUser.name;

    // Initialize theme from localStorage
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


    // Set up navigation
    setupNavigation();

    // Load initial data
    await loadAllData();

    // Global event delegation
    setupGlobalEventListeners();

  } catch (error) {
    console.error('Initialization error:', error);
    if (error.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    }
  }
});

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

      // Special handling for Study Buddy section
      if (sectionName === 'study-buddy') {
        if (!window.studyBuddySection) {
          window.studyBuddySection = new StudyBuddySection();
        }
        setTimeout(() => {
          window.studyBuddySection.init();
        }, 100);
      }

      // Update header
      updateHeader(sectionName);

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
    overview: 'Admin Dashboard',
    users: 'User Management',
    courses: 'Course Management',
    assignments: 'Assignment Management',
    sessions: 'Session Management',
    attendance: 'Attendance Management',
    messages: 'Message Overview',
    'study-buddy': 'AI Study Buddy'
  };

  const subtitles = {
    overview: 'System overview and statistics',
    users: 'Manage all students and professors',
    courses: 'Manage all courses in the system',
    assignments: 'View and manage all assignments',
    sessions: 'View and manage all class sessions',
    attendance: 'Track and manage student attendance',
    messages: 'View all system messages',
    'study-buddy': 'Your personal AI learning assistant'
  };

  const titleElement = document.getElementById('section-title');
  if (titleElement) titleElement.textContent = titles[sectionName] || sectionName;
}

// Load all data
async function loadAllData() {
  try {
    const [usersRes, coursesRes, assignmentsRes, sessionsRes, messagesRes, analyticsRes, pendingRes] = await Promise.all([
      fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json()),
      api.getCourses(),
      api.getAssignments(),
      api.getSessions(),
      api.getMessages(),
      fetch('/api/analytics/admin', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json()),
      fetch('/api/courses/enrollments/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json())
    ]);

    allUsers = usersRes.users || [];
    courses = coursesRes.courses || [];
    assignments = assignmentsRes.assignments || [];
    sessions = sessionsRes.sessions || [];
    messages = messagesRes.messages || [];

    // Store analytics and pending enrollments
    window.analyticsData = analyticsRes || {};
    window.pendingEnrollments = pendingRes.enrollments || [];

    renderOverview();
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

// Render pending enrollments
function renderPendingEnrollments() {
  const tbody = document.getElementById('pending-enrollments-table');
  const noDataEl = document.getElementById('no-pending-enrollments');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (!window.pendingEnrollments || window.pendingEnrollments.length === 0) {
    tbody.parentElement.style.display = 'none'; // Hide table
    noDataEl.style.display = 'block';
    return;
  }

  tbody.parentElement.style.display = 'table'; // Show table
  noDataEl.style.display = 'none';

  window.pendingEnrollments.forEach(enrollment => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>
                <div class="user-info">
                    <div class="user-details">
                        <div class="user-name">${enrollment.student?.name || 'Unknown'}</div>
                        <div class="user-email">${enrollment.student?.email || ''}</div>
                    </div>
                </div>
            </td>
            <td>${enrollment.course?.name || 'Unknown Course'}</td>
            <td>${new Date(enrollment.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon success" onclick="handleEnrollmentAction(${enrollment.courseId}, '${enrollment.id}', 'approved')" title="Approve">
                        <i class="ri-check-line"></i>
                    </button>
                    <button class="btn-icon danger" onclick="handleEnrollmentAction(${enrollment.courseId}, '${enrollment.id}', 'rejected')" title="Reject">
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// Handle enrollment action (approve/reject)
async function handleEnrollmentAction(courseId, enrollmentId, status) {
  if (!confirm(`Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this enrollment?`)) return;

  try {
    const res = await fetch(`/api/courses/${courseId}/enroll/${enrollmentId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status })
    });

    const data = await res.json();

    if (data.success) {
      showNotification(`Enrollment ${status} successfully`, 'success');
      // Reload data to update UI
      loadAllData();
    } else {
      showNotification(data.message || 'Error updating enrollment', 'error');
    }
  } catch (error) {
    console.error('Enrollment action error:', error);
    showNotification('Server error', 'error');
  }
}

// Render analytics charts
function renderAnalyticsCharts() {
  if (!window.analyticsData || !window.analyticsData.success) return;

  const { newRegistrations, coursePopularity } = window.analyticsData;

  // New Students Chart (Pie/Doughnut for now as we have total count)
  // Note: API returns count, but for a line chart we'd need daily data. 
  // For now, let's show User Distribution which is more readily available from the API response
  // or use the newRegistrations count in a simple way.

  // Actually, let's use the User Distribution from analytics response
  const userDist = window.analyticsData.userDistribution;

  const ctx1 = document.getElementById('newStudentsChart').getContext('2d');
  new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: ['Students', 'Professors', 'Admins'],
      datasets: [{
        data: [userDist.students, userDist.professors, userDist.admins],
        backgroundColor: ['#1a516f', '#2d7a9e', '#4aa5cc'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'User Distribution' }
      }
    }
  });

  // Course Popularity Chart
  const ctx2 = document.getElementById('coursePopularityChart').getContext('2d');
  new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: coursePopularity.map(c => c.name),
      datasets: [{
        label: 'Enrolled Students',
        data: coursePopularity.map(c => c.studentCount),
        backgroundColor: '#1a516f',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// Load section data
async function loadSectionData(sectionName) {
  switch (sectionName) {
    case 'users':
      renderUsers();
      break;
    case 'courses':
      renderCourses();
      break;
    case 'assignments':
      renderAssignments();
      break;
    case 'sessions':
      renderSessions();
      break;
    case 'attendance':
      renderAttendance();
      break;
    case 'messages':
      renderMessages();
      break;
  }
}

// Render Attendance Section
function renderAttendance() {
  const courseSelect = document.getElementById('attendance-course-select');
  const sessionSelect = document.getElementById('attendance-session-select');
  const dateInput = document.getElementById('attendance-date');
  const loadBtn = document.getElementById('load-attendance-btn');
  const saveBtn = document.getElementById('save-attendance-btn');
  const markAllBtn = document.getElementById('mark-all-present-btn');

  // Set default date to today
  if (!dateInput.value) {
    dateInput.valueAsDate = new Date();
  }

  // Populate courses
  courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
  courses.forEach(course => {
    const option = document.createElement('option');
    option.value = course.id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  // Handle course change to load sessions
  courseSelect.onchange = () => {
    const courseId = courseSelect.value;
    sessionSelect.innerHTML = '<option value="">-- Select Session --</option>';

    if (courseId) {
      const courseSessions = sessions.filter(s => s.courseId == courseId);
      courseSessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = `${session.title} (${new Date(session.scheduledAt).toLocaleDateString()})`;
        sessionSelect.appendChild(option);
      });
    }
  };

  // Load Students
  loadBtn.onclick = async () => {
    const courseId = courseSelect.value;
    const date = dateInput.value;

    if (!courseId || !date) {
      showNotification('Please select a course and date', 'error');
      return;
    }

    try {
      // 1. Get Course to find enrolled students
      // Note: In a real app, we should have an endpoint to get students for a course
      // For now, we'll filter from allUsers based on enrollment (if we had that data locally)
      // Or better, fetch attendance which includes student info, OR fetch course with students.

      // Let's fetch the course details which includes students
      const courseRes = await fetch(`/api/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json());

      if (!courseRes.success) throw new Error(courseRes.message);

      const enrolledStudents = courseRes.course.students || [];

      // 2. Fetch existing attendance for this date
      let url = `/api/attendance?courseId=${courseId}&date=${date}`;
      const sessionId = sessionSelect.value;
      if (sessionId) {
        url += `&sessionId=${sessionId}`;
      }
      const attRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.json());

      const existingAttendance = attRes.attendance || [];
      const attendanceMap = {};
      existingAttendance.forEach(a => attendanceMap[a.studentId] = a);

      // Render Table
      const tbody = document.getElementById('attendance-table-body');
      tbody.innerHTML = '';

      if (enrolledStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No students enrolled in this course</td></tr>';
      } else {
        enrolledStudents.forEach(student => {
          const att = attendanceMap[student.id] || {};
          const status = att.status || 'present'; // Default to present

          const tr = document.createElement('tr');
          tr.dataset.studentId = student.id;
          tr.innerHTML = `
                        <td>
                            <div class="user-info">
                                <div class="user-details">
                                    <div class="user-name">${student.name}</div>
                                    <div class="user-email">${student.email}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <select class="form-control status-select">
                                <option value="present" ${status === 'present' ? 'selected' : ''}>Present</option>
                                <option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option>
                                <option value="late" ${status === 'late' ? 'selected' : ''}>Late</option>
                                <option value="excused" ${status === 'excused' ? 'selected' : ''}>Excused</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="form-control notes-input" placeholder="Notes" value="${att.notes || ''}">
                        </td>
                    `;
          tbody.appendChild(tr);
        });
      }

      document.getElementById('attendance-list-container').style.display = 'block';

    } catch (error) {
      console.error('Error loading attendance:', error);
      showNotification('Error loading data', 'error');
    }
  };

  // Mark All Present
  markAllBtn.onclick = () => {
    document.querySelectorAll('#attendance-table-body .status-select').forEach(select => {
      select.value = 'present';
    });
  };

  // Save Attendance
  saveBtn.onclick = async () => {
    const courseId = courseSelect.value;
    const sessionId = sessionSelect.value || null;
    const date = dateInput.value;
    const rows = document.querySelectorAll('#attendance-table-body tr');

    const attendanceData = [];
    rows.forEach(row => {
      if (row.dataset.studentId) {
        attendanceData.push({
          studentId: row.dataset.studentId,
          status: row.querySelector('.status-select').value,
          notes: row.querySelector('.notes-input').value
        });
      }
    });

    if (attendanceData.length === 0) return;

    const records = attendanceData.map(record => ({
      studentId: record.studentId,
      courseId: parseInt(courseId),
      sessionId: sessionId ? parseInt(sessionId) : null,
      date: date,
      status: record.status,
      notes: record.notes
    }));

    if (records.length === 0) return;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ records })
      });

      const data = await res.json();
      if (data.success) {
        showNotification('Attendance saved successfully', 'success');
      } else {
        showNotification(data.message || 'Error saving attendance', 'error');
      }
    } catch (error) {
      console.error('Save attendance error:', error);
      showNotification('Server error', 'error');
    }
  };
}

// Render overview
function renderOverview() {
  const students = allUsers.filter(u => u.role === 'student');
  const professors = allUsers.filter(u => u.role === 'professor');

  document.getElementById('total-students').textContent = students.length;
  document.getElementById('total-professors').textContent = professors.length;
  document.getElementById('total-courses').textContent = courses.length;
  document.getElementById('total-assignments').textContent = assignments.length;

  // Render charts
  renderAnalyticsCharts();

  // Render new widgets
  renderAIInsights();
  renderTopPerformers();

  // Render pending enrollments
  renderPendingEnrollments();

  // Recent activity
  const recentActivityEl = document.getElementById('recent-activity');
  const recentItems = [];

  // Add recent assignments
  assignments.slice(0, 3).forEach(a => {
    recentItems.push({
      type: 'assignment',
      text: `Assignment "${a.title}" created for ${a.course?.name || 'course'}`,
      date: a.createdAt
    });
  });

  // Add recent sessions
  sessions.slice(0, 3).forEach(s => {
    recentItems.push({
      type: 'session',
      text: `Session "${s.title}" scheduled for ${new Date(s.scheduledAt).toLocaleDateString()}`,
      date: s.createdAt
    });
  });

  // Add recent enrollments from analytics
  if (window.analyticsData && window.analyticsData.recentEnrollments) {
    window.analyticsData.recentEnrollments.forEach(e => {
      recentItems.push({
        type: 'enrollment',
        text: `New enrollment in ${e.course?.name || 'course'}`,
        date: e.createdAt
      });
    });
  }

  // Sort by date desc
  recentItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (recentItems.length) {
    recentActivityEl.innerHTML = recentItems.slice(0, 5).map(item => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="${item.type === 'assignment' ? 'ri-file-list-line' : item.type === 'session' ? 'ri-calendar-event-line' : 'ri-user-add-line'}"></i>
        </div>
        <div class="activity-content">
          <p>${item.text}</p>
          <span class="activity-time">${new Date(item.date).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  } else {
    recentActivityEl.innerHTML = '<p class="text-muted">No recent activity</p>';
  }
}

// Render AI Insights
function renderAIInsights() {
  const container = document.getElementById('ai-insights-container');
  if (!container) return;

  // Mock AI Logic - In a real app, this would come from the backend analysis
  const insights = [];

  // 1. Attendance Insight
  const lowAttendance = Math.random() < 0.5;
  if (lowAttendance) {
    insights.push({
      type: 'warning',
      title: 'Attendance Alert',
      message: 'Average attendance dropped by 15% this week in React Mastery.'
    });
  } else {
    insights.push({
      type: 'success',
      title: 'Attendance Rising',
      message: 'Attendance is up 10% across all courses this month!'
    });
  }

  // 2. Performance Insight
  insights.push({
    type: 'info',
    title: 'Performance Trend',
    message: 'Students who attend >90% of sessions score 20% higher on assignments.'
  });

  // 3. Engagement Insight
  if (window.pendingEnrollments && window.pendingEnrollments.length > 0) {
    insights.push({
      type: 'action',
      title: 'Action Required',
      message: `You have ${window.pendingEnrollments.length} pending enrollment requests to review.`
    });
  }

  container.innerHTML = insights.map(insight => `
        <div class="ai-insight-item" style="border-left-color: ${insight.type === 'warning' ? '#e74c3c' : insight.type === 'success' ? '#2ecc71' : '#3498db'}">
            <div class="ai-insight-icon" style="color: ${insight.type === 'warning' ? '#e74c3c' : insight.type === 'success' ? '#2ecc71' : '#3498db'}">
                <i class="${insight.type === 'warning' ? 'ri-alert-line' : insight.type === 'success' ? 'ri-line-chart-line' : 'ri-lightbulb-line'}"></i>
            </div>
            <div class="ai-insight-content">
                <h4>${insight.title}</h4>
                <p>${insight.message}</p>
            </div>
        </div>
    `).join('');
}

// Render Top Performers
function renderTopPerformers() {
  const container = document.getElementById('top-performers-container');
  if (!container) return;

  const performers = window.analyticsData?.topPerformers || [];

  if (performers.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No performance data available yet.</p>';
    return;
  }

  container.innerHTML = performers.map(p => `
        <div class="performer-item">
            <div class="performer-info">
                <div class="performer-avatar">
                    ${p.name.charAt(0)}
                </div>
                <div class="performer-details">
                    <h4>${p.name}</h4>
                    <p>${p.submissionCount} Submissions</p>
                </div>
            </div>
            <div class="performer-score">
                ${p.averageGrade}%
            </div>
        </div>
    `).join('');
}

// Filter users
window.filterUsers = function () {
  const searchInput = document.getElementById('user-search');
  const roleFilter = document.getElementById('user-role-filter');

  const searchText = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedRole = roleFilter ? roleFilter.value : 'all';

  currentFilter = selectedRole;

  renderUsers();
}

// Delete item
// Delete item function is now handled by delete-functions.js
// window.deleteItem = async function (type, id, name) { ... }

// Render users
function renderUsers() {
  const usersTableBody = document.getElementById('users-table-body');
  if (!usersTableBody) return;

  const searchInput = document.getElementById('user-search');
  const roleFilter = document.getElementById('user-role-filter');

  const searchText = searchInput ? searchInput.value.toLowerCase() : '';
  const selectedRole = roleFilter ? roleFilter.value : 'all';

  let filteredUsers = allUsers;

  // Filter by role
  if (selectedRole !== 'all') {
    filteredUsers = filteredUsers.filter(u => u.role === selectedRole);
  }

  // Filter by search text (name or email)
  if (searchText) {
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(searchText) ||
      u.email.toLowerCase().includes(searchText)
    );
  }

  if (!filteredUsers.length) {
    usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found.</td></tr>';
    return;
  }

  usersTableBody.innerHTML = filteredUsers.map(user => {
    // Don't allow deleting yourself
    const isSelf = user.id === currentUser.id;

    return `
      <tr>
        <td>
          <div class="user-info">
            <div class="user-avatar-small">${user.role === 'professor' ? '👨‍🏫' : '👨‍🎓'}</div>
            <span>${user.name}</span>
          </div>
        </td>
        <td>${user.email}</td>
        <td><span class="badge ${user.role === 'professor' ? 'badge-primary' : 'badge-success'}">${user.role}</span></td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewUserDetails('${user.id}', '${user.role}')">View</button>
          <button class="btn btn-primary btn-sm" onclick="openEditUserModal('${user.id}')">Edit</button>
          ${!isSelf ? `<button class="btn btn-danger btn-sm delete-user-btn" data-id="${user.id}" data-name="${user.name}" style="background-color: #dc3545; color: white;">Delete</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners for delete buttons
  usersTableBody.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const userId = this.getAttribute('data-id');
      const userName = this.getAttribute('data-name');
      deleteItem('user', userId, userName);
    });
  });
}

// View user details - Open in new tab
window.viewUserDetails = function (userId, role) {
  let url;
  if (role === 'student') {
    url = `/student/dashboard.html?userId=${userId}`;
  } else if (role === 'professor') {
    url = `/professor/dashboard.html?userId=${userId}`;
  } else {
    url = `/admin/user-profile.html?id=${userId}&role=${role}`;
  }
  window.open(url, '_blank');
}

// Render courses
function renderCourses() {
  const coursesEl = document.getElementById('courses-list');

  if (!courses.length) {
    coursesEl.innerHTML = '<p class="text-muted">No courses available.</p>';
    return;
  }

  coursesEl.innerHTML = `
      <div class="table-responsive" >
        <table class="table">
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Professor</th>
              <th>Students</th>
              <th>Duration</th>
              <th>Start Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${courses.map(course => `
            <tr>
              <td><strong>${course.name}</strong><br><small class="text-muted">${course.description}</small></td>
              <td>${course.professor?.name || 'Not assigned'}</td>
              <td>${course.students?.length || 0}</td>
              <td>${course.duration}</td>
              <td>${new Date(course.startDate).toLocaleDateString()}</td>
              <td><span class="badge ${course.isActive !== false ? 'badge-success' : 'badge-warning'}">${course.isActive !== false ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="editCourse('${course.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem('course', '${course.id}', '${course.name}')" style="background-color: #dc3545; color: white;">Delete</button>
              </td>
            </tr>
          `).join('')}
          </tbody>
        </table>
    </div>
      `;
}

// Render assignments
function renderAssignments() {
  const assignmentsEl = document.getElementById('assignments-list');

  if (!assignments.length) {
    assignmentsEl.innerHTML = '<p class="text-muted">No assignments available.</p>';
    return;
  }

  assignmentsEl.innerHTML = `
      <div class="table-responsive" >
        <table class="table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Course</th>
              <th>Due Date</th>
              <th>Max Score</th>
              <th>Submissions</th>
              <th>Graded</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${assignments.map(assignment => {
    const submissionsCount = assignment.submissions?.length || 0;
    const gradedCount = assignment.submissions?.filter(s => s.grade !== undefined).length || 0;

    return `
              <tr>
                <td><strong>${assignment.title}</strong><br><small class="text-muted">${assignment.description}</small></td>
                <td>${assignment.course?.name || 'N/A'}</td>
                <td>${new Date(assignment.dueDate).toLocaleDateString()}</td>
                <td>${assignment.maxScore}</td>
                <td><span class="badge badge-primary">${submissionsCount}</span></td>
                <td>${gradedCount}/${submissionsCount}</td>
                <td><span class="badge ${assignment.isActive !== false ? 'badge-success' : 'badge-warning'}">${assignment.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="editAssignment('${assignment.id}')">Edit</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteItem('assignment', '${assignment.id}', '${assignment.title}')" style="background-color: #dc3545; color: white;">Delete</button>
                </td>
              </tr>
            `;
  }).join('')}
          </tbody>
        </table>
    </div>
      `;
}

// Render sessions
function renderSessions() {
  const sessionsEl = document.getElementById('sessions-list');

  if (!sessions.length) {
    sessionsEl.innerHTML = '<p class="text-muted">No sessions scheduled.</p>';
    return;
  }

  sessionsEl.innerHTML = `
      <div class="table-responsive" >
        <table class="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Course</th>
              <th>Professor</th>
              <th>Scheduled</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(session => {
    const isUpcoming = new Date(session.scheduledAt) > new Date();
    return `
              <tr>
                <td>
                  <strong>${session.title}</strong>
                  ${session.description ? `<br><small class="text-muted">${session.description}</small>` : ''}
                </td>
                <td>${session.course?.name || 'N/A'}</td>
                <td>${session.professor?.name || 'N/A'}</td>
                <td>${new Date(session.scheduledAt).toLocaleString()}</td>
                <td>${session.duration} min</td>
                <td><span class="badge ${isUpcoming ? 'badge-primary' : 'badge-secondary'}">${session.status}</span></td>
                <td>
                  ${session.meetingLink ? `<a href="${session.meetingLink}" target="_blank" class="btn btn-success btn-sm">Join</a>` : ''}
                  <button class="btn btn-danger btn-sm" onclick="deleteItem('session', '${session.id}', '${session.title}')" style="background-color: #dc3545; color: white;">Delete</button>
                </td>
              </tr>
            `;
  }).join('')}
          </tbody>
        </table>
    </div>
      `;
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
          <button class="btn btn-primary mt-3" onclick="startNewConversation()">Start New Chat</button>
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

// Open Create Group Modal
// Open Create Group Modal
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
            <h2>Create New Group</h2>
            <button class="modal-close" onclick="closeModal('create-group-modal')">×</button>
          </div>
          <div class="modal-body">
            <form id="create-group-form" onsubmit="createGroup(event)">
              <div class="form-group">
                <label for="group-name">Group Name</label>
                <input type="text" id="group-name" name="name" required placeholder="e.g., Web Dev Project Team">
              </div>
              <div class="form-group">
                <label>Select Participants</label>
                <div class="user-selection-list" id="user-selection-list" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); padding: 10px; border-radius: 5px;">
                  <!-- Users will be populated here -->
                  <div style="text-align: center; padding: 20px;">Loading users...</div>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('create-group-modal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
    </div>
      `;

  document.getElementById('modal-container').innerHTML = modalHtml;

  // Populate users
  const userListContainer = document.getElementById('user-selection-list');
  userListContainer.innerHTML = '';

  const users = allUsers.filter(u => u.id !== currentUser.id);

  // Group users by course/role
  const groupedUsers = {};
  users.forEach(u => {
    const key = u.role === 'student' ? 'Students' : 'Professors';
    if (!groupedUsers[key]) groupedUsers[key] = [];
    groupedUsers[key].push(u);
  });

  for (const [group, groupUsers] of Object.entries(groupedUsers)) {
    const groupHeader = document.createElement('div');
    groupHeader.style.fontWeight = 'bold';
    groupHeader.style.padding = '8px 0';
    groupHeader.style.marginTop = '15px';
    groupHeader.style.marginBottom = '5px';
    groupHeader.style.borderBottom = '1px solid var(--border-color)';
    groupHeader.style.textAlign = 'center'; // Center header text
    // Removed explicit color to allow theme to handle it
    groupHeader.textContent = group;
    userListContainer.appendChild(groupHeader);

    groupUsers.forEach(u => {
      const userItem = document.createElement('div');
      userItem.className = 'user-select-item';
      userItem.style.display = 'flex';
      userItem.style.alignItems = 'center';
      userItem.style.padding = '8px 0';
      userItem.style.paddingLeft = '10px'; // Indent items
      userItem.style.borderBottom = '1px solid var(--border-color-light, #eee)'; // Light separator

      userItem.innerHTML = `
      <input type="checkbox" id="user-${u.id}" name="participants" value="${u.id}" style="margin-right: 12px; width: 16px; height: 16px; cursor: pointer;">
        <label for="user-${u.id}" style="cursor: pointer; flex: 1; font-size: 0.95rem; user-select: none;">${u.name} <span style="color: var(--text-muted); font-size: 0.85rem;">(${u.email})</span></label>
    `;
      userListContainer.appendChild(userItem);
    });
  }
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
    icon.classList.remove('ri-sun-line', 'ri-moon-line');
    icon.classList.add(theme === 'dark' ? 'ri-sun-line' : 'ri-moon-line');
    icon.textContent = '';
  }
}

// Profile Menu
window.toggleProfileMenu = function (event) {
  if (event) event.stopPropagation();
  const dropdown = document.querySelector('.user-profile-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
  }
}

// Global click handler for dropdowns and theme
document.addEventListener('click', (e) => {
  // Close profile dropdown if clicked outside
  const dropdown = document.querySelector('.user-profile-dropdown');
  if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

// Initialize
function setupGlobalEventListeners() {
  document.body.addEventListener('click', (e) => {
    // Theme Toggle
    const themeBtn = e.target.closest('#theme-toggle');
    if (themeBtn) {
      toggleTheme(e);
    }

    // Profile Trigger
    const profileTrigger = e.target.closest('.profile-trigger');
    if (profileTrigger) {
      toggleProfileMenu(e);
    }
  });

  const profileTrigger = document.querySelector('.profile-trigger');
  if (profileTrigger) {
    profileTrigger.onclick = toggleProfileMenu;
  }
}

async function loadUserInfo() {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();

    if (data.success) {
      currentUser = data.user;

      // Update Header Info
      document.getElementById('user-name').textContent = currentUser.name;
      document.getElementById('header-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

      // Update Dropdown Info
      document.getElementById('menu-user-name').textContent = currentUser.name;
      document.getElementById('menu-user-role').textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
      document.getElementById('menu-avatar').textContent = currentUser.name.charAt(0).toUpperCase();

      // Update Last Login
      if (currentUser.lastLogin) {
        const date = new Date(currentUser.lastLogin);
        document.getElementById('last-login-time').textContent = new Date(currentUser.lastLogin).toLocaleString();
        const mobileLastLogin = document.getElementById('mobile-last-login-time');
        if (mobileLastLogin) {
          mobileLastLogin.textContent = new Date(currentUser.lastLogin).toLocaleString();
        }
      } else {
        document.getElementById('last-login-time').textContent = 'First Login';
        const mobileLastLogin = document.getElementById('mobile-last-login-time');
        if (mobileLastLogin) {
          mobileLastLogin.textContent = 'First Login';
        }
      }

      // Update Mobile Profile Menu
      const mobileHeaderAvatar = document.getElementById('mobile-header-avatar');
      const mobileMenuAvatar = document.getElementById('mobile-menu-avatar');
      const mobileMenuUserName = document.getElementById('mobile-menu-user-name');
      const mobileMenuUserRole = document.getElementById('mobile-menu-user-role');
      const mobileMenuUserEmail = document.getElementById('mobile-menu-user-email');

      if (mobileHeaderAvatar) {
        mobileHeaderAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
      }
      if (mobileMenuAvatar) {
        mobileMenuAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
      }
      if (mobileMenuUserName) {
        mobileMenuUserName.textContent = currentUser.name;
      }
      if (mobileMenuUserRole) {
        mobileMenuUserRole.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
      }
      if (mobileMenuUserEmail) {
        mobileMenuUserEmail.textContent = currentUser.email;
      }

      // Re-attach event listeners for dynamic elements
      // Update Theme Icon
      updateThemeIcon(document.documentElement.getAttribute('data-theme'));

      // Theme toggle listener is handled by global delegation

      const profileTrigger = document.querySelector('.profile-trigger');
      if (profileTrigger) {
        profileTrigger.onclick = toggleProfileMenu; // Direct assignment to ensure binding
      }

      // Load users for chat if needed
      if (!allUsers || allUsers.length === 0) {
        // fetch users logic is in openCreateGroupModal, but good to have here too if needed
      }
    }
  } catch (error) {
    console.error('Error loading user info:', error);
    if (error.message.includes('401')) {
      logout();
    }
  }
}


// Create Group
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

// Open Profile Modal
window.openProfileModal = function () {
  if (!currentUser) return;

  const lastLoginDate = currentUser.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : 'Never';

  const modalHtml = `
      <div class="modal" id="profile-modal" style="display: flex;">
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h2>My Profile</h2>
            <button class="modal-close" onclick="closeModal('profile-modal')">×</button>
          </div>
          <div class="modal-body">
            <form id="profile-form" onsubmit="saveProfile(event)">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="width: 100px; height: 100px; background: var(--primary-gradient); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: white; margin: 0 auto;">
                  ${currentUser.name.charAt(0).toUpperCase()}
                </div>
                <h3 style="margin-top: 10px;">${currentUser.name}</h3>
                <span class="badge badge-primary">${currentUser.role.toUpperCase()}</span>
              </div>

              <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="profile-name" name="name" value="${currentUser.name}" readonly disabled style="opacity: 0.7;">
              </div>

              <div class="form-group">
                <label>Email Address</label>
                <input type="email" id="profile-email" name="email" value="${currentUser.email}" readonly disabled style="opacity: 0.7;">
              </div>

              <div class="form-group">
                <label>User ID</label>
                <input type="text" value="${currentUser.id}" readonly disabled style="opacity: 0.7; background: var(--bg-tertiary);">
              </div>

              <div class="form-group">
                <label>Last Login</label>
                <div style="padding: 10px; background: var(--bg-tertiary); border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px;">
                  <i class="ri-time-line" style="font-size: 1.2rem; color: var(--text-muted);"></i>
                  <span>${lastLoginDate}</span>
                </div>
              </div>

              <div class="modal-actions" style="justify-content: space-between;">
                <button type="button" class="btn btn-secondary" onclick="closeModal('profile-modal')">Close</button>
                <div style="display: flex; gap: 10px;">
                  <button type="button" class="btn btn-primary" id="edit-profile-btn" onclick="toggleEditProfile()">
                    <i class="ri-edit-line"></i> Edit
                  </button>
                  <button type="submit" class="btn btn-success" id="save-profile-btn" style="display: none;">
                    <i class="ri-check-line"></i> Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
    </div>
      `;

  document.getElementById('modal-container').innerHTML = modalHtml;
}

// Toggle Edit Profile Mode
window.toggleEditProfile = function () {
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const editBtn = document.getElementById('edit-profile-btn');
  const saveBtn = document.getElementById('save-profile-btn');

  const isEditing = !nameInput.disabled;

  if (isEditing) {
    // Cancel Edit
    nameInput.disabled = true;
    nameInput.readOnly = true;
    nameInput.style.opacity = '0.7';
    nameInput.value = currentUser.name; // Reset

    emailInput.disabled = true;
    emailInput.readOnly = true;
    emailInput.style.opacity = '0.7';
    emailInput.value = currentUser.email; // Reset

    editBtn.style.display = 'inline-flex';
    saveBtn.style.display = 'none';
  } else {
    // Start Edit
    nameInput.disabled = false;
    nameInput.readOnly = false;
    nameInput.style.opacity = '1';
    nameInput.focus();

    emailInput.disabled = false;
    emailInput.readOnly = false;
    emailInput.style.opacity = '1';

    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-flex';
  }
}

// Save Profile
window.saveProfile = async function (event) {
  event.preventDefault();
  const name = document.getElementById('profile-name').value;
  const email = document.getElementById('profile-email').value;

  try {
    const response = await fetch(`/api/users/${currentUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name, email })
    });

    const data = await response.json();

    if (data.success) {
      alert('Profile updated successfully');
      currentUser.name = name;
      currentUser.email = email;

      // Update UI
      document.getElementById('user-name').textContent = name;
      document.getElementById('header-avatar').textContent = name.charAt(0).toUpperCase();
      document.getElementById('menu-user-name').textContent = name;
      document.getElementById('menu-avatar').textContent = name.charAt(0).toUpperCase();

      closeModal('profile-modal');
    } else {
      alert(data.message || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile');
  }
}

// --- Modern Chat Implementation ---

// Render messages (Chat Interface)
async function renderMessages() {
  const messagesEl = document.getElementById('messages-list');
  if (!messagesEl) return;

  // Create chat layout - matching student/professor dashboard structure
  // Create chat layout
  messagesEl.innerHTML = `
      <div class="chat-container-modern">
          <!-- Sidebar -->
          <div class="chat-sidebar">
              <div class="chat-sidebar-header">
              <div style="margin-bottom: 20px; padding: 0 10px; display: flex; align-items: center; gap: 12px;">
                  <button class="mobile-menu-btn btn-icon" onclick="toggleGlobalSidebar()" style="font-size: 1.5rem; color: var(--text-primary);">
                      <i class="ri-menu-line"></i>
                  </button>
                  <img src="/images/sindhu-logo.png" alt="Sindhu Software" style="height: 32px; width: auto; display: block;">
              </div>
              <div class="search-box">
                  <i class="ri-search-line" style="color: var(--chat-text-muted);"></i>
                  <input type="text" placeholder="Search chats..." id="chat-search">
              </div>
          </div>
              <div class="chat-list" id="conversation-list">
                  <div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading...</div>
              </div>
              
              <!-- Fixed Sidebar Footer -->
              <div class="chat-sidebar-footer" style="padding: 16px; border-top: 1px solid var(--chat-border);">
                  <button class="btn-new-chat" onclick="startNewConversation()">
                      <i class="ri-add-line"></i> Create New
                  </button>
                  <button class="btn-new-chat" onclick="openCreateGroupModal()" style="background: var(--bg-secondary); color: var(--text-primary); margin-top: 10px;">
                      <i class="ri-group-line"></i> Create Group
                  </button>
              </div>
          </div>


          <!-- Main Chat -->
          <div class="chat-main" id="chat-window">
              <div class="chat-header" id="chat-header" style="visibility: hidden; position: relative;">
                  
                  <!-- Normal Header Content -->
                  <div class="header-content" style="display: flex; flex: 1; align-items: center;">
                      <div class="header-user" onclick="toggleDetails()" style="flex: 1; overflow: hidden; display: flex; align-items: center; gap: 10px;">
                          <button class="mobile-back-btn" onclick="event.stopPropagation(); document.querySelector('.chat-container-modern').classList.remove('mobile-chat-active')">
                            <i class="ri-arrow-left-line"></i>
                          </button>
                          <div class="avatar-wrapper">
                               <img src="/images/avatar-placeholder.png" alt="User" class="avatar-img" id="chat-header-avatar">
                               <div class="status-dot status-online" id="chat-header-status-dot"></div>
                          </div>
                          <div style="min-width: 0;">
                              <h3 class="chat-name" id="chat-header-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Select a conversation</h3>
                              <div class="chat-time" id="chat-header-status" style="text-align: left; color: #10b981;">Online</div>
                          </div>
                      </div>
                      
                      <!-- Search Bar (Hidden by default) -->
                      <div class="chat-header-search" id="chat-search-bar">
                          <i class="ri-search-line"></i>
                          <input type="text" placeholder="Search in chat..." onkeyup="searchInChat(this.value)">
                          <i class="ri-close-circle-fill" onclick="toggleSearch()" style="left: auto; right: 12px; cursor: pointer; color: #9ca3af;"></i>
                      </div>

                      <div class="header-actions">
                          <button class="action-btn" title="Search" onclick="toggleSearch()">
                              <i class="ri-search-line"></i>
                          </button>
                          <div style="position: relative;">
                              <button class="action-btn" title="More Options" onclick="toggleChatOptions(event)">
                                  <i class="ri-more-fill"></i>
                              </button>
                              <!-- Dropdown Menu -->
                              <div class="chat-options-dropdown" id="chat-options-menu">
                                  <button class="dropdown-item" onclick="toggleSelectionMode(true)">
                                      <i class="ri-checkbox-multiple-line"></i> Select Messages
                                  </button>
                                  <button class="dropdown-item danger" onclick="deleteChatConversation(currentConversationId, document.getElementById('chat-header-name').innerText)">
                                      <i class="ri-delete-bin-line"></i> Delete Chat
                                  </button>
                              </div>
                          </div>
                          <button class="action-btn" onclick="toggleDetails()" title="Info">
                              <i class="ri-information-line"></i>
                          </button>
                      </div>
                  </div>

                  <!-- Selection Mode Header (Overlay) -->
                  <div class="selection-header" id="selection-header">
                      <div style="display: flex; align-items: center; gap: 10px;">
                          <button class="btn-icon" onclick="toggleSelectionMode(false)">
                              <i class="ri-close-line"></i>
                          </button>
                          <span id="selection-count" style="font-weight: 600;">0 Selected</span>
                      </div>
                      <div style="display: flex; gap: 10px;">
                          <button class="btn-icon" onclick="copySelectedMessages()" title="Copy Text">
                              <i class="ri-file-copy-line"></i>
                          </button>
                          <button class="btn-icon" onclick="deleteSelectedMessages()" style="color: #ef4444;" title="Delete">
                              <i class="ri-delete-bin-line"></i>
                          </button>
                      </div>
                  </div>

              </div>

              <div class="chat-messages" id="messages-container">
                  <div class="empty-state" style="text-align: center; margin-top: 100px;">
                      <i class="ri-chat-smile-2-line" style="font-size: 4rem; color: #d1fae5;"></i>
                      <h3 style="color: var(--chat-text); margin-top: 20px;">Select a conversation</h3>
                      <p style="color: var(--chat-text-muted);">Choose a user or group to start chatting</p>
                  </div>
              </div>

              <!-- Chat Footer (Input) -->
              <div class="chat-footer" id="chat-footer" style="display: none;">
                  <button class="btn-icon" onclick="document.getElementById('file-input').click()">
                      <i class="ri-attachment-2"></i>
                  </button>
                  <input type="file" id="file-input" style="display: none;" onchange="handleFileUpload(this)">
                  
                  <div class="input-wrapper">
                      <input type="text" placeholder="Type a message..." id="messageInput" onkeypress="if(event.key === 'Enter') sendMessage(currentConversationId)">
                      <button class="btn-emoji">
                          <i class="ri-emotion-line"></i>
                      </button>
                  </div>
                  
                  <button class="btn-send" onclick="sendMessage(currentConversationId)">
                      <i class="ri-send-plane-fill"></i>
                  </button>
              </div>
          </div>

          <!-- Details Pane -->
          <div class="chat-details" id="chat-details-pane">
              <div class="details-content">
                  <div class="details-header">
                      <div class="action-btn" onclick="toggleDetails()" style="cursor: pointer;"><i class="ri-close-line"></i></div>
                  </div>
                  
                  <!-- Profile Info -->
                  <div class="profile-section">
                      <img src="/images/avatar-placeholder.png" id="details-avatar" class="profile-large-img">
                      <h3 class="profile-name-lg" id="details-name">User Name</h3>
                      <span class="profile-status-lg" id="details-status">Online</span>
                  </div>

                  <!-- About -->
                  <div class="detail-block">
                      <h4 class="detail-block-title">About</h4>
                      <div class="info-row">
                          <p style="font-size: 0.9rem; line-height: 1.5; color: var(--chat-text-muted);" id="details-bio">
                              N/A
                          </p>
                      </div>
                      <div class="info-row">
                          <i class="ri-phone-line"></i>
                          <span id="details-phone">N/A</span>
                      </div>
                      <div class="info-row">
                          <i class="ri-mail-line"></i>
                          <span id="details-email">N/A</span>
                      </div>
                  </div>

                  <!-- Settings -->
                  <div class="detail-block">
                      <h4 class="detail-block-title">Settings</h4>
                      <div class="setting-row">
                          <div class="setting-label"><i class="ri-notification-3-line"></i> Notification</div>
                          <div class="toggle-switch-ios active"></div>
                      </div>
                      <div class="setting-row">
                          <div class="setting-label"><i class="ri-star-line"></i> Starred Messages</div>
                          <i class="ri-arrow-right-s-line" style="color: var(--chat-text-muted);"></i>
                      </div>
                  </div>
                  
                  <!-- Media -->
                  <div class="detail-block">
                      <div class="setting-row">
                          <h4 class="detail-block-title" style="margin:0;">Media and Files</h4>
                          <i class="ri-arrow-right-s-line" style="color: var(--chat-text-muted);"></i>
                      </div>
                      <div class="media-grid">
                          <div class="media-thumb"></div>
                          <div class="media-thumb"></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  `;

  // Start checking for conversations
  await loadConversations();
}

// Toggle Details Pane
window.toggleDetails = function () {
  const pane = document.getElementById('chat-details-pane');
  if (pane) {
    pane.classList.toggle('open');
  }
}

// Update Details Content
function updateDetailsPane(name, id, userDetails = {}) {
  const nameEl = document.getElementById('details-name');
  const avatarEl = document.getElementById('details-avatar');
  const bioEl = document.getElementById('details-bio');
  const phoneEl = document.getElementById('details-phone');
  const emailEl = document.getElementById('details-email');

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.src = userDetails.avatar || '/images/avatar-placeholder.png';
  if (bioEl) bioEl.textContent = userDetails.bio || "N/A";
  if (phoneEl) phoneEl.textContent = userDetails.phone || "N/A";
  if (emailEl) emailEl.textContent = userDetails.email || "N/A";
}


// Load conversations
async function loadConversations() {
  try {
    const response = await fetch('/api/messages/conversations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    if (data.success) {
      const conversationList = document.getElementById('conversation-list');
      if (!conversationList) return;

      // Filter out AI assistant conversations
      const filteredConversations = data.conversations.filter(conv => {
        let otherId = null;
        if (conv.user) {
          otherId = conv.user.id;
        } else if (conv.participants) {
          const other = currentUser ? conv.participants.find(p => p.id !== currentUser.id) : null;
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
        let avatar = '/images/avatar-placeholder.png';

        if (conv.type === 'group') {
          name = conv.name;
          avatar = conv.avatar || '/images/group-placeholder.png';
        } else {
          if (conv.user) {
            otherParticipant = conv.user;
            name = conv.user.name;
            if (conv.user.avatar) avatar = conv.user.avatar;
          } else if (conv.participants && conv.participants.length > 0) {
            otherParticipant = conv.participants.find(p => p.id !== currentUser.id);
            name = otherParticipant ? otherParticipant.name : 'Unknown User';
            if (otherParticipant && otherParticipant.avatar) avatar = otherParticipant.avatar;
          }
        }

        const lastMessage = conv.lastMessage ? (conv.lastMessage.content.length > 30 ? conv.lastMessage.content.substring(0, 30) + '...' : conv.lastMessage.content) : 'No messages yet';
        const time = conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const unreadCount = conv.unreadCount || 0;

        // Get activity status for online indicator
        const activityStatus = conv.activityStatus || 'Never seen';
        const isOnline = activityStatus === 'Online';

        return `
            <div class="chat-item ${unreadCount > 0 ? 'unread' : ''}" data-conversation-id="${conv.conversationId || conv.id}" data-conversation-name="${name}" data-activity-status="${activityStatus}">
               <div class="avatar-wrapper">
                 <img src="${avatar}" class="avatar-img" alt="${name}">
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

      // Add click listeners to conversation items
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
    const response = await fetch(`/api/messages/conversation/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
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
                        <div class="reply-context">
                            <i class="ri-reply-line"></i>
                            <span class="reply-sender">Replying to ${msg.replyTo.sender?.name || 'User'}</span>
                            <span class="reply-text">${replyText}</span>
                        </div>
                    `;
          }

          messagesContainer.innerHTML += `
                  <div class="msg-wrapper ${isMe ? 'sent' : 'received'}" data-msg-id="${msg.id}">
                    <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
                    ${!isMe ? `<img src="${(msg.sender && msg.sender.avatar) ? msg.sender.avatar : '/images/avatar-placeholder.png'}" class="msg-avatar">` : ''}
                    <div class="msg-bubble" style="position: relative;">
                        ${msg.isStarred ? '<div class="msg-star-icon"><i class="ri-star-fill"></i></div>' : ''}
                        ${msg.reactions && Object.keys(msg.reactions).length > 0 ? `
                            <div class="msg-reaction-badge" onclick="event.stopPropagation(); toggleEmojiPicker(${msg.id}, this)">
                                <span>${Object.values(msg.reactions)[0]}</span>
                                <span class="msg-reaction-count">${Object.keys(msg.reactions).length}</span>
                            </div>
                        ` : ''}
                        ${replyContext}
                        ${msg.content}
                        <span class="msg-time">
                            ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            ${moneyIsRead(msg, isMe)}
                        </span>
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
    console.error(e);
    if (messagesContainer) messagesContainer.innerHTML = 'Error loading messages';
  }

  // 3. Update Details Pane
  // We can fetch user details if conv is direct, or just use convName
  // For now, simple update
  updateDetailsPane(conversationName, conversationId, {
    avatar: '/images/avatar-placeholder.png',
    bio: 'User details...',
    phone: 'N/A',
    email: 'N/A'
  });

  // 4. Show Footer
  // 4. Show Footer & Attach Input Listeners
  const footer = document.getElementById('chat-footer');
  if (footer) {
    footer.style.display = 'flex';
    const input = document.getElementById('messageInput');

    if (input) {
      // Remove old listeners
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);

      // Typing Emitter
      let typingTimeout;
      newInput.addEventListener('input', () => {
        if (!typingTimeout) {
          const socket = io(); // Use client-side socket instance
          socket.emit('typing', { conversationId, receiverId: null }); // Placeholder for receiverId
          // For direct, we need receiverId. Admin chat logic is slightly different?
          // Admin usually chats one-on-one. 
          // We can iterate participants or just emit to room if we join conversation room (which we don't, we join user_id).
          // But 'typing' event expects receiverId.
          // Fetch participants or infer? 
          // Existing socket logic emits to user_receiverId.
          // We need to know who we are talking to.
          // 'loadChatHistory' has 'conversationId'.
          // We should probably emit to the OTHER participant.
          // In Admin dashboard, we don't easily have the other user ID in scope right here.
          // But wait, the messages have sender/receiver.
          // Let's assume we rely on the server handling or we pass the partner ID.
          // Actually, for now, let's omit receiverId if we don't have it, or try to get it from context.
          // loadChatHistory doesn't pass participant ID.
          // But we can get it from the chat item dataset if we look back.
          // Or we can rely on `activityStatus` being passed? No.

          // Hack: In our socket implementation, `typing` requires `receiverId` to emit to `user_ID`.
          // If we don't have it, it won't work.
          // Student dashboard has `currentUser` and `chatUser` (maybe).
          // Admin dashboard needs the partner ID. 
          // Let's find where to get it. 
        }
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          const socket = io(); // Use client-side socket instance
          socket.emit('stop_typing', { conversationId, receiverId: null }); // Placeholder
          typingTimeout = null;
        }, 2000);
      });

      newInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage(conversationId);
      });
    }
  }

  // Socket Listeners
  const socket = io(); // Reuse global socket

  socket.off('typing');
  socket.off('stop_typing');
  socket.off('message_read');

  socket.on('typing', (data) => {
    if (String(data.conversationId) === String(conversationId) && data.senderId !== currentUser.id) {
      showTypingIndicator();
    }
  });

  socket.on('stop_typing', (data) => {
    if (String(data.conversationId) === String(conversationId)) {
      hideTypingIndicator();
    }
  });

  socket.on('message_read', (data) => {
    if (String(data.conversationId) === String(conversationId)) {
      markMessagesAsRead();
    }
  });

  socket.on('message_delivered', (data) => {
    if (String(data.conversationId) === String(conversationId)) {
      const wrapper = document.querySelector(`.msg-wrapper[data-msg-id="${data.messageId}"]`);
      if (wrapper) {
        const statusParams = wrapper.querySelector('.msg-status');
        if (statusParams && !statusParams.classList.contains('read')) {
          statusParams.className = 'msg-status delivered';
          statusParams.title = 'Delivered';
          statusParams.innerHTML = '<i class="ri-check-double-line"></i>';
        }
      }
    }
  });

  socket.on('message_reaction', (data) => {
    if (String(data.conversationId) === String(conversationId)) {
      updateMessageReaction(data.messageId, data.reactions);
    }
  });

  // Listen for new messages to emit delivery status
  socket.on('message', (msg) => {
    if (String(msg.conversationId) === String(conversationId)) {
      // Check if already exists (optimistic)
      if (!document.querySelector(`[data-msg-id="${msg.id}"]`)) {
        appendMessage(msg);
      }
      // Emit delivered event
      if (msg.senderId !== currentUser.id) {
        socket.emit('message_delivered', {
          messageId: msg.id,
          senderId: msg.senderId,
          conversationId: msg.conversationId
        });
        // Also mark as read if window is focused (simplified for now)
        socket.emit('message_read', { messageId: msg.id, senderId: msg.senderId });
      }
    }
  });
}

// Helpers for Admin Chat
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

  // Build reply context if replying
  let replyContext = '';
  if (window.currentReplyTo) {
    // Get reply message details from the DOM
    const replyMsg = document.querySelector(`[data-msg-id="${window.currentReplyTo}"]`);
    if (replyMsg) {
      const replyBubble = replyMsg.querySelector('.msg-bubble');
      const replyText = replyBubble ? replyBubble.textContent.trim().substring(0, 50) : 'Message';
      replyContext = `
        <div class="reply-context">
          <i class="ri-reply-line"></i>
          <span class="reply-sender">Replying to ${window.currentReplySender || 'User'}</span>
          <span class="reply-text">${replyText}${replyText.length > 50 ? '...' : ''}</span>
        </div>
      `;
    }
  }

  // Add message to UI immediately
  messagesContainer.innerHTML += `
    <div class="msg-wrapper sent" data-msg-id="${tempMsgId}">
      <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
      <div class="msg-bubble">
        ${replyContext}
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

  const payload = {
    conversationId: conversationId,
    content: content
  };

  if (window.currentReplyTo) {
    payload.replyToId = window.currentReplyTo;
  }

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (data.success) {
      // Update temp message with real ID
      const tempMsg = messagesContainer.querySelector(`[data-msg-id="${tempMsgId}"]`);
      if (tempMsg && data.message) {
        tempMsg.setAttribute('data-msg-id', data.message.id);
      }

      if (tempMsg && data.message) {
        tempMsg.setAttribute('data-msg-id', data.message.id);
      }

      // Clear reply state
      window.currentReplyTo = null;
      window.currentReplySender = null;
      const preview = document.querySelector('.reply-preview');
      if (preview) preview.remove();
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

window.toggleDetailsPane = function () {
  const pane = document.getElementById('chat-details-pane');
  const chatWindow = document.getElementById('chat-window');
  if (pane && chatWindow) {
    pane.classList.toggle('active');
    if (pane.classList.contains('active')) {
      chatWindow.style.marginRight = '300px'; // Adjust based on CSS
      // Load details
      const activeItem = document.querySelector('.chat-item.active');
      if (activeItem) {
        const name = activeItem.dataset.conversationName;
        // Here normally you'd fetch more info
        pane.innerHTML = `
                <div class="details-header">
                   <h3>Details</h3>
                   <button class="btn-icon" onclick="toggleDetailsPane()"><i class="ri-close-line"></i></button>
                </div>
                <div class="details-content">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <img src="/images/avatar-placeholder.png" class="details-avatar">
                        <h4>${name}</h4>
                    </div>
                    <div class="details-section">
                        <h5>Shared Media</h5>
                        <div class="media-grid">
                           <div class="media-item"></div>
                           <div class="media-item"></div>
                        </div>
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
    // Extract text node contents only ideally, but innerText works
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

  // Optimistic delete
  checked.forEach(cb => {
    const wrapper = cb.closest('.msg-wrapper');
    wrapper.remove();
  });

  toggleSelectionMode(false);
  // In real app, send IDs to backend
}

window.toggleEmojiPicker = function (messageId, button) {
  // Close any existing picker
  const existingPicker = document.querySelector('.emoji-picker');
  if (existingPicker) existingPicker.remove();

  // Create emoji picker
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';
  // Inline styles for safety if CSS missing
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

window.addReaction = async function (messageId, emoji) {
  // Close emoji picker
  const picker = document.querySelector('.emoji-picker');
  if (picker) picker.remove();

  try {
    const response = await fetch(`/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ emoji })
    });

    const data = await response.json();
    if (data.success) {
      // UI update is handled via socket event, but we can do optimistic update here too
      updateMessageReaction(messageId, data.reactions);
    } else {
      console.error('Failed to react:', data.message);
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
  }
};



// Start new conversation modal
window.startNewConversation = function () {
  const users = allUsers.filter(u => u.id !== currentUser.id);

  // Group users
  const professors = users.filter(u => u.role === 'professor');
  const students = users.filter(u => u.role === 'student');
  const others = users.filter(u => u.role !== 'professor' && u.role !== 'student');

  // Group students by course
  const studentsByCourse = {};
  const otherStudents = [];

  students.forEach(student => {
    if (student.enrolledCourses && student.enrolledCourses.length > 0) {
      student.enrolledCourses.forEach(course => {
        if (!studentsByCourse[course.name]) {
          studentsByCourse[course.name] = [];
        }
        studentsByCourse[course.name].push(student);
      });
    } else {
      otherStudents.push(student);
    }
  });

  // Build Options HTML
  let optionsHtml = '<option value="">Choose a user...</option>';

  // Professors
  if (professors.length > 0) {
    optionsHtml += '<optgroup label="Professors">';
    professors.forEach(p => {
      optionsHtml += `<option value="${p.id}">${p.name}</option>`;
    });
    optionsHtml += '</optgroup>';
  }

  // Students by Course
  Object.keys(studentsByCourse).sort().forEach(courseName => {
    optionsHtml += `<optgroup label="Course: ${courseName}">`;
    studentsByCourse[courseName].forEach(s => {
      optionsHtml += `<option value="${s.id}">${s.name}</option>`;
    });
    optionsHtml += '</optgroup>';
  });

  // Other Students
  if (otherStudents.length > 0) {
    optionsHtml += '<optgroup label="Other Students">';
    otherStudents.forEach(s => {
      optionsHtml += `<option value="${s.id}">${s.name}</option>`;
    });
    optionsHtml += '</optgroup>';
  }

  // Others (Admins etc)
  if (others.length > 0) {
    optionsHtml += '<optgroup label="Others">';
    others.forEach(o => {
      optionsHtml += `<option value="${o.id}">${o.name} (${o.role})</option>`;
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
            ${optionsHtml}
          </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="initiateChat()">Start Chat</button>
      </div>
    </div>
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

// Show create course modal (admin can create courses)
window.showCreateCourse = function () {
  // Get all professors for dropdown
  const professors = allUsers.filter(u => u.role === 'professor');

  if (!professors.length) {
    alert('No professors available. Please ensure professors are registered first.');
    return;
  }

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
            <label>Assign Professor</label>
            <select id="course-professor" required>
              <option value="">Select a professor</option>
              ${professors.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
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
window.createCourse = async function (e) {
  e.preventDefault();

  const courseData = {
    name: document.getElementById('course-name').value,
    professorId: document.getElementById('course-professor').value,
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

// Close modal
window.closeModal = function (event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  document.getElementById('modal-container').innerHTML = '';
}

// --- User Management Functions ---

// Open Add User Modal
window.openAddUserModal = function () {
  const modal = `
    <div class="modal" onclick="closeAddUserModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Add New User</h2>
          <button class="modal-close" onclick="closeAddUserModal(event)">×</button>
        </div>
        <form id="add-user-form" onsubmit="createUser(event)">
          <!-- Basic Information Section -->
          <div class="form-section">
            <h3 style="margin-top: 0; margin-bottom: var(--spacing-md); font-size: 1.1rem; border-bottom: 2px solid var(--border-color); padding-bottom: var(--spacing-xs);">Basic Information</h3>
            
            <div class="form-group">
              <label for="user-role">Role *</label>
              <select id="user-role" name="role" required onchange="toggleRoleSpecificFields()">
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="professor">Professor</option>
              </select>
            </div>

            <div class="form-group">
              <label for="user-name">Full Name *</label>
              <input type="text" id="user-name" name="name" required placeholder="Enter full name">
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="user-email">Email Address *</label>
                <input type="email" id="user-email" name="email" required placeholder="example@email.com">
              </div>

              <div class="form-group">
                <label for="user-phone">Phone Number *</label>
                <input type="tel" id="user-phone" name="phone" required placeholder="+91 9876543210" pattern="[0-9+\\- ]{10,15}">
              </div>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="user-password">Password *</label>
                <input 
                  type="password" 
                  id="user-password" 
                  name="password" 
                  required 
                  minlength="8"
                  pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[\\W_]).{8,}$"
                  placeholder="8+ chars with A-Z, a-z, 0-9, symbols"
                  title="Password must be at least 8 characters and include: uppercase letter, lowercase letter, number, and special character"
                >
                <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.25rem;">
                  Must include: A-Z, a-z, 0-9, and symbols (!@#$%^&amp;*)
                </small>
              </div>

              <div class="form-group">
                <label for="user-dob">Date of Birth (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  id="user-dob" 
                  name="dateOfBirth" 
                  placeholder="DD-MM-YYYY (e.g., 15-05-2000)"
                  pattern="^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\\d{4}$"
                  title="Date must be in DD-MM-YYYY format (e.g., 15-05-2000)"
                >
                <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.25rem;">
                  Format: DD-MM-YYYY (e.g., 15-05-2000)
                </small>
              </div>
            </div>

            <div class="form-group">
              <label for="user-address">Address</label>
              <textarea id="user-address" name="address" rows="2" placeholder="Enter complete address"></textarea>
            </div>
          </div>

          <!-- Student-Specific Fields -->
          <div class="form-section student-fields" style="display: none;">
            <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-md); font-size: 1.1rem; border-bottom: 2px solid var(--border-color); padding-bottom: var(--spacing-xs);">Student Information</h3>
            
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="student-education">Highest Education</label>
                <select id="student-education" name="highestEducation">
                  <option value="">Select Education Level</option>
                  <option value="High School">High School</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              <div class="form-group">
                <label for="student-field">Field of Study</label>
                <input type="text" id="student-field" name="fieldOfStudy" placeholder="e.g., Computer Science, Engineering">
              </div>
            </div>

            <div class="form-group">
              <label for="student-institution">Previous Institution/University</label>
              <input type="text" id="student-institution" name="institution" placeholder="Name of school/college/university">
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="student-year">Year of Passing</label>
                <input type="number" id="student-year" name="yearOfPassing" min="1950" max="${new Date().getFullYear()}" placeholder="e.g., 2023">
              </div>

              <div class="form-group">
                <label for="student-experience">Work Experience (Years)</label>
                <input type="number" id="student-experience" name="workExperience" min="0" max="50" step="0.5" placeholder="e.g., 2.5">
              </div>
            </div>

            <div class="form-group">
              <label for="student-company">Current/Previous Company</label>
              <input type="text" id="student-company" name="companyName" placeholder="Company name (if applicable)">
            </div>

            <div class="form-group">
              <label for="student-goals">Learning Goals</label>
              <textarea id="student-goals" name="learningGoals" rows="2" placeholder="What do you want to achieve from this training?"></textarea>
            </div>
          </div>

          <!-- Professor-Specific Fields -->
          <div class="form-section professor-fields" style="display: none;">
            <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-md); font-size: 1.1rem; border-bottom: 2px solid var(--border-color); padding-bottom: var(--spacing-xs);">Professor Information</h3>
            
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="prof-qualification">Highest Qualification *</label>
                <select id="prof-qualification" name="qualification">
                  <option value="">Select Qualification</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                  <option value="Post-Doctoral">Post-Doctoral</option>
                </select>
              </div>

              <div class="form-group">
                <label for="prof-specialization">Specialization *</label>
                <input type="text" id="prof-specialization" name="specialization" placeholder="e.g., Data Analytics, Business Intelligence">
              </div>
            </div>

            <div class="form-group">
              <label for="prof-experience">Teaching Experience (Years) *</label>
              <input type="number" id="prof-experience" name="teachingExperience" min="0" max="50" step="0.5" placeholder="e.g., 5.5">
            </div>

            <div class="form-group">
              <label for="prof-expertise">Areas of Expertise</label>
              <input type="text" id="prof-expertise" name="expertise" placeholder="e.g., Tableau, Power BI, SQL, Python">
              <small style="color: var(--text-muted); font-size: 0.875rem;">Separate multiple areas with commas</small>
            </div>

            <div class="form-group">
              <label for="prof-certifications">Certifications</label>
              <textarea id="prof-certifications" name="certifications" rows="2" placeholder="List relevant certifications"></textarea>
            </div>

            <div class="form-group">
              <label for="prof-linkedin">LinkedIn Profile</label>
              <input type="url" id="prof-linkedin" name="linkedinUrl" placeholder="https://linkedin.com/in/username">
            </div>
          </div>

          <!-- Emergency Contact Section -->
          <div class="form-section">
            <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-md); font-size: 1.1rem; border-bottom: 2px solid var(--border-color); padding-bottom: var(--spacing-xs);">Emergency Contact</h3>
            
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="emergency-name">Emergency Contact Name</label>
                <input type="text" id="emergency-name" name="emergencyContactName" placeholder="Full name">
              </div>

              <div class="form-group">
                <label for="emergency-relation">Relationship</label>
                <input type="text" id="emergency-relation" name="emergencyRelation" placeholder="e.g., Father, Mother, Spouse">
              </div>
            </div>

            <div class="form-group">
              <label for="emergency-phone">Emergency Contact Phone</label>
              <input type="tel" id="emergency-phone" name="emergencyPhone" placeholder="+91 9876543210" pattern="[0-9+\\- ]{10,15}">
            </div>
          </div>

          <!-- Bio Section -->
          <div class="form-section">
            <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-md); font-size: 1.1rem; border-bottom: 2px solid var(--border-color); padding-bottom: var(--spacing-xs);">Additional Information</h3>
            
            <div class="form-group">
              <label for="user-bio">Bio/About</label>
              <textarea id="user-bio" name="bio" rows="3" placeholder="Tell us about yourself..."></textarea>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeAddUserModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Create User</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Toggle role-specific fields
window.toggleRoleSpecificFields = function () {
  const role = document.getElementById('user-role').value;
  const studentFields = document.querySelectorAll('.student-fields');
  const professorFields = document.querySelectorAll('.professor-fields');

  if (role === 'student') {
    studentFields.forEach(field => field.style.display = 'block');
    professorFields.forEach(field => field.style.display = 'none');

    // Make student-specific fields optional
    document.getElementById('student-education').removeAttribute('required');
  } else if (role === 'professor') {
    studentFields.forEach(field => field.style.display = 'none');
    professorFields.forEach(field => field.style.display = 'block');

    // Make professor-specific fields required
    document.getElementById('prof-qualification').setAttribute('required', 'required');
    document.getElementById('prof-specialization').setAttribute('required', 'required');
    document.getElementById('prof-experience').setAttribute('required', 'required');
  } else {
    studentFields.forEach(field => field.style.display = 'none');
    professorFields.forEach(field => field.style.display = 'none');
  }
}

// Close Add User Modal
window.closeAddUserModal = function (event) {
  if (event) event.preventDefault();
  document.getElementById('modal-container').innerHTML = '';
}

// Comprehensive validation function
function validateUserData(userData) {
  const currentYear = new Date().getFullYear();

  // 1. Validate Date of Birth - Age must be between 18 and 60
  if (userData.dateOfBirth) {
    const dobParts = userData.dateOfBirth.split('-');
    if (dobParts.length === 3) {
      const day = parseInt(dobParts[0]);
      const month = parseInt(dobParts[1]);
      const year = parseInt(dobParts[2]);

      // Check if date is valid
      const dob = new Date(year, month - 1, day);
      if (isNaN(dob.getTime())) {
        return 'Invalid date of birth. Please enter a valid date.';
      }

      // Calculate age
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (age < 18) {
        return `Age must be at least 18 years. Current age: ${age} years.\nMinimum age requirement not met for enrollment.`;
      }

      if (age > 60) {
        return `Age must not exceed 60 years. Current age: ${age} years.\nPlease contact administration for special enrollment.`;
      }

      // 2. Validate Year of Passing (if provided)
      if (userData.yearOfPassing) {
        const yearOfPassing = parseInt(userData.yearOfPassing);

        if (yearOfPassing > currentYear) {
          return `Year of passing cannot be in the future. Please enter a valid past year.`;
        }

        // Year of passing should be after turning 15 (minimum school completion age)
        const minPassingYear = year + 15;
        if (yearOfPassing < minPassingYear) {
          return `Year of passing (${yearOfPassing}) seems incorrect. Based on date of birth, earliest possible year would be ${minPassingYear}.`;
        }

        // Year of passing should not be more than age years ago
        const maxYearsAgo = age;
        if ((currentYear - yearOfPassing) > maxYearsAgo) {
          return `Year of passing (${yearOfPassing}) seems inconsistent with age (${age} years).`;
        }
      }

      // 3. Validate Work Experience
      if (userData.workExperience) {
        const workExp = parseFloat(userData.workExperience);

        if (workExp < 0) {
          return 'Work experience cannot be negative.';
        }

        // Work experience should not exceed (age - 18) years
        const maxPossibleExp = age - 18;
        if (workExp > maxPossibleExp) {
          return `Work experience (${workExp} years) exceeds maximum possible based on age.\nMaximum possible: ${maxPossibleExp} years (assuming work started at age 18).`;
        }

        // If yearOfPassing is provided, work experience should not exceed years since passing
        if (userData.yearOfPassing) {
          const yearsSincePassing = currentYear - parseInt(userData.yearOfPassing);
          if (workExp > yearsSincePassing + 1) { // +1 for same year graduation and work
            return `Work experience (${workExp} years) exceeds years since graduation (${yearsSincePassing} years).`;
          }
        }
      }
    }
  }

  // 4. Validate Phone Numbers - Primary phone should not equal emergency contact phone
  if (userData.phone && userData.emergencyPhone) {
    // Clean phone numbers for comparison (remove spaces, dashes, etc.)
    const cleanPhone = userData.phone.replace(/[\s\-\(\)]/g, '');
    const cleanEmergencyPhone = userData.emergencyPhone.replace(/[\s\-\(\)]/g, '');

    if (cleanPhone === cleanEmergencyPhone) {
      return 'Emergency contact phone number must be different from primary phone number.\nPlease provide a different emergency contact.';
    }
  }

  // 5. Validate Teaching Experience for Professors
  if (userData.role === 'professor' && userData.teachingExperience) {
    const teachingExp = parseFloat(userData.teachingExperience);

    if (teachingExp < 0) {
      return 'Teaching experience cannot be negative.';
    }

    // For professors, calculate age if DOB provided
    if (userData.dateOfBirth) {
      const dobParts = userData.dateOfBirth.split('-');
      const year = parseInt(dobParts[2]);
      const dob = new Date(year, parseInt(dobParts[1]) - 1, parseInt(dobParts[0]));
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      // Teaching experience should not exceed (age - 22) assuming minimum qualification age
      const maxPossibleTeaching = age - 22;
      if (teachingExp > maxPossibleTeaching) {
        return `Teaching experience (${teachingExp} years) exceeds maximum possible based on age.\nMaximum possible: ${maxPossibleTeaching} years (assuming teaching started at age 22).`;
      }
    }
  }

  // 6. Check for realistic name (no numbers, minimum length)
  if (userData.name) {
    if (userData.name.length < 3) {
      return 'Name must be at least 3 characters long.';
    }

    if (/\d/.test(userData.name)) {
      return 'Name should not contain numbers. Please enter a valid name.';
    }

    // Check for test/dummy names
    const lowerName = userData.name.toLowerCase();
    if (lowerName.includes('test') || lowerName.includes('dummy') || lowerName.includes('sample') || lowerName === 'abc' || lowerName === 'xyz') {
      return 'Please use a real name instead of test/dummy names.';
    }
  }

  // 7. Validate email format (basic check, backend will do thorough check)
  if (userData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return 'Please enter a valid email address.';
    }

    // Check for test emails
    const lowerEmail = userData.email.toLowerCase();
    if (lowerEmail.includes('test@') || lowerEmail.includes('dummy@') || lowerEmail.includes('sample@')) {
      return 'Please use a real email address instead of test/dummy emails.';
    }
  }

  return null; // No errors
}

// Create User
window.createUser = async function (e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const userData = Object.fromEntries(formData.entries());

  // Get the submit button and show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;

  // Comprehensive validation before submission
  const validationError = validateUserData(userData);
  if (validationError) {
    alert('❌ Validation Error:\n\n' + validationError);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating User...';

  // Convert DD-MM-YYYY to YYYY-MM-DD for backend
  if (userData.dateOfBirth && userData.dateOfBirth.includes('-')) {
    const dateParts = userData.dateOfBirth.split('-');
    if (dateParts.length === 3) {
      // Convert DD-MM-YYYY to YYYY-MM-DD
      userData.dateOfBirth = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    }
  }

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (data.success) {
      // Show success message with details
      const roleLabel = userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
      alert(`✅ Success!\n\n${roleLabel} "${userData.name}" has been created successfully!\n\nUser ID: ${data.user.id}\nEmail: ${data.user.email}`);

      closeAddUserModal();
      await loadAllData(); // Reload data to show new user
      renderUsers();
    } else {
      // Show detailed error message
      let errorMessage = data.message || 'Error creating user';

      // If there are validation errors, show them
      if (data.errors && data.errors.length > 0) {
        errorMessage = 'Validation Errors:\n\n';
        data.errors.forEach(err => {
          errorMessage += `• ${err.msg}\n`;
        });
      }

      alert('❌ ' + errorMessage);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('Error creating user:', error);
    alert('❌ Server error creating user. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// Open Edit User Modal
window.openEditUserModal = function (userId) {
  const user = allUsers.find(u => u.id == userId);
  if (!user) {
    alert('User not found');
    return;
  }

  const isStudent = user.role === 'student';
  const isProfessor = user.role === 'professor';

  const modal = `
    <div class="modal" onclick="closeEditUserModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Edit User: ${user.name}</h2>
          <button class="modal-close" onclick="closeEditUserModal(event)">×</button>
        </div>
        <form onsubmit="updateUser(event, '${userId}')">
          <!-- Basic Information -->
          <div class="form-section">
            <h3 style="margin-top: 0; margin-bottom: var(--spacing-md); color: var(--text-primary); font-size: 1.1rem;">📋 Basic Information</h3>
            
            <div class="form-group">
              <label>Role</label>
              <input type="text" value="${user.role}" disabled style="background: var(--card-bg); cursor: not-allowed;">
              <small style="color: var(--text-muted);">Role cannot be changed</small>
            </div>

            <div class="form-group">
              <label for="edit-user-name">Full Name *</label>
              <input type="text" id="edit-user-name" name="name" value="${user.name || ''}" required>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="edit-user-email">Email *</label>
                <input type="email" id="edit-user-email" name="email" value="${user.email || ''}" required>
              </div>

              <div class="form-group">
                <label for="edit-user-phone">Phone Number *</label>
                <input type="tel" id="edit-user-phone" name="phone" value="${user.phone || ''}" required>
              </div>
            </div>

            <div class="form-group">
              <label for="edit-user-password">New Password (leave blank to keep current)</label>
              <input 
                type="password" 
                id="edit-user-password" 
                name="password" 
                minlength="8"
                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*(),.?&quot;:{}|<>_\\-+=]).{8,}$"
                placeholder="8+ chars with A-Z, a-z, 0-9, symbols"
              >
              <small style="color: var(--text-muted);">Leave empty to keep current password</small>
            </div>
          </div>

          ${isStudent ? `
          <!-- Student-Specific Fields -->
          <div class="form-section">
            <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-md); color: var(--text-primary); font-size: 1.1rem;">🎓 Student Information</h3>
            
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="edit-student-education">Highest Education</label>
                <input type="text" id="edit-student-education" name="highestEducation" value="${user.highestEducation || ''}">
              </div>

              <div class="form-group">
                <label for="edit-student-field">Field of Study</label>
                <input type="text" id="edit-student-field" name="fieldOfStudy" value="${user.fieldOfStudy || ''}">
              </div>
            </div>

            <div class="form-group">
              <label for="edit-student-institution">Institution</label>
              <input type="text" id="edit-student-institution" name="institution" value="${user.institution || ''}">
            </div>

            <div class="form-group">
              <label for="edit-student-goals">Learning Goals</label>
              <textarea id="edit-student-goals" name="learningGoals" rows="2">${user.learningGoals || ''}</textarea>
            </div>
          </div>
          ` : ''}

          ${isProfessor ? `
          <!-- Professor-Specific Fields -->
          <div class="form-section">
            <h3 style="margin-top: var(--spacing-md); margin-bottom: var(--spacing-md); color: var(--text-primary); font-size: 1.1rem;">👨‍🏫 Professor Information</h3>
            
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-sm);">
              <div class="form-group">
                <label for="edit-prof-qualification">Highest Qualification</label>
                <input type="text" id="edit-prof-qualification" name="qualification" value="${user.qualification || ''}">
              </div>

              <div class="form-group">
                <label for="edit-prof-specialization">Specialization</label>
                <input type="text" id="edit-prof-specialization" name="specialization" value="${user.specialization || ''}">
              </div>
            </div>

            <div class="form-group">
              <label for="edit-prof-experience">Teaching Experience (Years)</label>
              <input type="number" id="edit-prof-experience" name="teachingExperience" value="${user.teachingExperience || ''}" step="0.5">
            </div>

            <div class="form-group">
              <label for="edit-prof-expertise">Areas of Expertise</label>
              <input type="text" id="edit-prof-expertise" name="expertise" value="${user.expertise || ''}">
            </div>
          </div>
          ` : ''}

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeEditUserModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Update User</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Close Edit User Modal
window.closeEditUserModal = function (event) {
  if (event) event.preventDefault();
  document.getElementById('modal-container').innerHTML = '';
}

// Update User
window.updateUser = async function (e, userId) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const userData = Object.fromEntries(formData.entries());

  // Remove empty password if not provided
  if (!userData.password || userData.password.trim() === '') {
    delete userData.password;
  }

  try {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (data.success) {
      alert('User updated successfully!');
      closeEditUserModal();
      await loadAllData(); // Reload data
      renderUsers();
    } else {
      alert(data.message || 'Error updating user');
    }
  } catch (error) {
    console.error('Error updating user:', error);
    alert('Server error updating user');
  }
}


// Global data refresh functions for delete-functions.js
window.loadUsers = async function () {
  try {
    const response = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    allUsers = data.users || [];
    renderUsers();
  } catch (error) {
    console.error('Error reloading users:', error);
  }
};

window.loadCourses = async function () {
  try {
    const data = await api.getCourses();
    courses = data.courses || [];
    renderCourses();
  } catch (error) {
    console.error('Error reloading courses:', error);
  }
};

window.loadAssignments = async function () {
  try {
    const data = await api.getAssignments();
    assignments = data.assignments || [];
    renderAssignments();
  } catch (error) {
    console.error('Error reloading assignments:', error);
  }
};

window.loadSessions = async function () {
  try {
    const data = await api.getSessions();
    sessions = data.sessions || [];
    renderSessions();
  } catch (error) {
    console.error('Error reloading sessions:', error);
  }
};

// Delete Confirmation Modal Logic
let pendingDelete = null;

// Open Delete Modal (replaces window.deleteItem from delete-functions.js)
window.deleteItem = function (type, id, name) {
  pendingDelete = { type, id, name };

  const modalHtml = `
    <div class="modal" id="delete-confirmation-modal" style="display: flex;">
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2 class="text-danger">Confirm Deletion</h2>
                <button class="modal-close" onclick="closeDeleteModal()">×</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; padding: 20px 0;">
                    <i class="ri-error-warning-line" style="font-size: 4rem; color: #dc3545; margin-bottom: 15px;"></i>
                    <p style="font-size: 1.1rem; margin-bottom: 10px;">Are you sure you want to delete <strong>${name}</strong>?</p>
                    <p class="text-muted">This action cannot be undone.</p>
                </div>
                <div class="modal-actions" style="justify-content: center; gap: 15px;">
                    <button class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                    <button class="btn btn-danger" onclick="confirmDelete()">Delete</button>
                </div>
            </div>
        </div>
    </div>
    `;

  document.getElementById('modal-container').innerHTML = modalHtml;
};

// Close Delete Modal
window.closeDeleteModal = function () {
  const modal = document.getElementById('delete-confirmation-modal');
  if (modal) {
    modal.remove();
  }
  pendingDelete = null;
};

// Confirm Delete Action
window.confirmDelete = async function () {
  if (!pendingDelete) return;

  const { type, id, name } = pendingDelete;

  // Close modal first
  closeDeleteModal();

  // Execute the actual delete function from delete-functions.js
  if (window.executeDelete) {
    await window.executeDelete(type, id, name);
  } else {
    console.error('executeDelete function not found');
    alert('Error: Delete function not available');
  }
};

// --- Chat Helpers ---

window.setReplyTo = function (msgId, senderName, content) {
  const inputWrapper = document.querySelector('.input-wrapper');
  const existing = inputWrapper.querySelector('.reply-preview');
  if (existing) existing.remove();

  const preview = document.createElement('div');
  preview.className = 'reply-preview';
  preview.innerHTML = `
        <div style="font-size: 12px; color: var(--primary-color);">Replying to ${senderName}</div>
        <div style="font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${content}</div>
        <i class="ri-close-line" onclick="this.parentElement.remove(); window.currentReplyTo = null; window.currentReplySender = null;" style="position: absolute; right: 5px; top: 5px; cursor: pointer;"></i>
    `;
  inputWrapper.insertBefore(preview, document.getElementById('messageInput'));
  window.currentReplyTo = msgId;
  window.currentReplySender = senderName;
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

function appendMessage(msg) {
  const messagesContainer = document.getElementById('messages-container');
  const isMe = msg.senderId === currentUser.id;

  // Reply context logic (simplified)
  const replyContext = '';

  messagesContainer.innerHTML += `
        <div class="msg-wrapper ${isMe ? 'sent' : 'received'}" data-msg-id="${msg.id}">
        <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
        ${!isMe ? `<img src="${(msg.sender && msg.sender.avatar) ? msg.sender.avatar : '/images/avatar-placeholder.png'}" class="msg-avatar">` : ''}
        <div class="msg-bubble" style="position: relative;">
            ${msg.isStarred ? '<div class="msg-star-icon"><i class="ri-star-fill"></i></div>' : ''}
             ${msg.reactions && Object.keys(msg.reactions).length > 0 ? `
                <div class="msg-reaction-badge" onclick="event.stopPropagation(); toggleEmojiPicker(${msg.id}, this)">
                    <span>${Object.values(msg.reactions)[0]}</span>
                    <span class="msg-reaction-count">${Object.keys(msg.reactions).length}</span>
                </div>
            ` : ''}
            ${msg.content}
            <span class="msg-time">
                ${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                ${moneyIsRead(msg, isMe)}
            </span>
             <div class="msg-actions">
                <button class="msg-action-btn" onclick="toggleStar(${msg.id}, this)" title="Star">
                <i class="${msg.isStarred ? 'ri-star-fill' : 'ri-star-line'}"></i>
                </button>
                <button class="msg-action-btn" onclick="toggleEmojiPicker(${msg.id}, this)" title="React">
                    <i class="ri-emotion-line"></i>
                </button>
                <button class="msg-action-btn" title="Reply">
                    <i class="ri-reply-line"></i>
                </button>
            </div>
        </div>
        </div>
    `;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateMessageReaction(messageId, reactions) {
  const wrapper = document.querySelector(`.msg-wrapper[data-msg-id="${messageId}"]`);
  if (!wrapper) return;
  const bubble = wrapper.querySelector('.msg-bubble');
  let badge = bubble.querySelector('.msg-reaction-badge');

  if (!reactions || Object.keys(reactions).length === 0) {
    if (badge) badge.remove();
    return;
  }

  const count = Object.keys(reactions).length;
  const firstEmoji = Object.values(reactions)[0];

  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'msg-reaction-badge';
    badge.onclick = (e) => { e.stopPropagation(); toggleEmojiPicker(messageId, badge); };
    // Insert before msg-actions or append
    bubble.appendChild(badge);
  }

  badge.innerHTML = `<span>${firstEmoji}</span><span class="msg-reaction-count">${count}</span>`;
}

window.handleFileUpload = function (input) {
  if (input.files && input.files[0]) {
    alert("File selected: " + input.files[0].name + " (Upload feature pending backend)");
    // Reset to allow re-selecting same file
    input.value = '';
  }
}

function moneyIsRead(msg, isMe) {
  if (!isMe) return '';

  // 3 Ticks (Read)
  if (msg.isRead) {
    return `
        <span class="msg-status read" title="Read">
            <i class="ri-check-double-line"></i><i class="ri-check-line" style="margin-left:-4px;"></i>
        </span>`;
  }

  // 2 Ticks (Delivered) - Requires deliveredAt from backend
  if (msg.deliveredAt) {
    return `
        <span class="msg-status delivered" title="Delivered">
            <i class="ri-check-double-line"></i>
        </span>`;
  }

  // 1 Tick (Sent)
  return `
        <span class="msg-status sent" title="Sent">
            <i class="ri-check-line"></i>
        </span>`;
}

function showTypingIndicator() {
  const container = document.getElementById('messages-container');
  if (!container.querySelector('.typing-indicator')) {
    const typingHtml = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
    container.insertAdjacentHTML('beforeend', typingHtml);
    container.scrollTop = container.scrollHeight;
  }
}

function hideTypingIndicator() {
  const indicator = document.querySelector('.typing-indicator');
  if (indicator) indicator.remove();
}

function markMessagesAsRead() {
  const sentMessages = document.querySelectorAll('.msg-wrapper.sent .msg-bubble');
  sentMessages.forEach(bubble => {
    if (!bubble.querySelector('.read-receipt')) {
      const timeSpan = bubble.querySelector('.msg-time');
      if (timeSpan) {
        timeSpan.insertAdjacentHTML('afterend', '<span class="read-receipt seen"><i class="ri-eye-line"></i></span>');
      }
    }
  });
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

  console.log('�� Found media messages:', mediaMessages.length);

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
