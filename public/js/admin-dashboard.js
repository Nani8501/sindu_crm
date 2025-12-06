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

    // Set up navigation
    setupNavigation();

    // Load initial data
    await loadAllData();

    // Global event delegation
    setupGlobalEventListeners();

  } catch (error) {
    console.error('Initialization error:', error);
    // window.location.href = '/login.html';
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
      document.getElementById(`${sectionName}-section`).classList.add('active');

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
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }
  updateThemeIcon(savedTheme);
}

// Toggle theme
function toggleTheme(event) {
  try {
    const body = document.body;
    const isLight = body.classList.contains('light-mode');

    // Get toggle button position
    const toggleBtn = document.getElementById('theme-toggle');
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight / 2;

    if (toggleBtn) {
      const rect = toggleBtn.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }

    // Create wave animation - REVERSED COLORS: white for dark mode, black for light mode
    const wave = document.createElement('div');
    wave.className = 'theme-wave';
    wave.style.cssText = `
    position: fixed;
    top: ${centerY}px;
    left: ${centerX}px;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: ${isLight ? '#ffffff' : '#000000'};
    transform: translate(-50%, -50%);
    z-index: 99999;
    pointer-events: none;
    opacity: 0.9;
    `;
    document.body.appendChild(wave);

    // Animate wave expanding from toggle button
    wave.animate([
      { width: '0px', height: '0px', opacity: 0.9 },
      { width: '3000px', height: '3000px', opacity: 0 }
    ], {
      duration: 800,
      easing: 'ease-out'
    }).onfinish = () => wave.remove();

    // Toggle theme
    body.classList.toggle('light-mode');

    // Update icon
    const icon = document.querySelector('.theme-icon');
    if (icon) {
      if (body.classList.contains('light-mode')) {
        icon.classList.remove('ri-moon-line');
        icon.classList.add('ri-sun-line');
      } else {
        icon.classList.remove('ri-sun-line');
        icon.classList.add('ri-moon-line');
      }
    }

    // Save to localStorage
    const theme = body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
    console.log('Theme saved to localStorage:', theme);
  } catch (error) {
    console.error('Error toggling theme:', error);
  }
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

// Load conversations
async function loadConversations() {
  try {
    const response = await fetch('/api/messages/conversations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    const listEl = document.getElementById('conversation-list');
    if (!listEl) return;

    // Buttons container positioned absolute at bottom
    const buttonsHtml = `
      <div style="position: absolute; bottom: 20px; left: 20px; right: 20px; display: flex; gap: 10px; z-index: 10;  padding-top: 10px;">
        <button class="btn btn-primary" onclick="startNewConversation()" style="flex: 1; display: flex; align-items: center; justify-content: center;">New Chat</button>
        <button class="btn btn-secondary" onclick="openCreateGroupModal()" style="flex: 1; display: flex; align-items: center; justify-content: center;">Create Group</button>
      </div>
      `;

    // Ensure list parent handles layout for floating buttons
    listEl.style.position = 'relative';
    listEl.style.overflow = 'hidden';
    listEl.style.display = 'flex';
    listEl.style.flexDirection = 'column';

    if (!data.conversations || data.conversations.length === 0) {
      listEl.innerHTML = `
      <div class="conversations-scroll" style="flex: 1; overflow-y: auto; padding-bottom: 80px;">
        <div class="empty-state" style="height: 200px;">
          <p>No conversations yet</p>
        </div>
      </div>
      ${buttonsHtml}
    `;
      return;
    }

    // Helper function to categorize conversations by time
    const getTimeCategory = (date) => {
      const now = new Date();
      const msgDate = new Date(date);
      const diffTime = now - msgDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Today
      if (now.toDateString() === msgDate.toDateString()) {
        return 'Today';
      }

      // Yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (yesterday.toDateString() === msgDate.toDateString()) {
        return 'Yesterday';
      }

      // This week (last 7 days including today)
      if (diffDays < 7) {
        return 'This Week';
      }

      // Last week (7-14 days ago)
      if (diffDays < 14) {
        return 'Last Week';
      }

      // Last month (14-30 days ago)
      if (diffDays < 30) {
        return 'Last Month';
      }

      // Last 6 months (30-180 days ago)
      if (diffDays < 180) {
        return 'Last 6 Months';
      }

      // Older
      return 'Older';
    };

    // Group conversations by time category
    const groupedConversations = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Last Week': [],
      'Last Month': [],
      'Last 6 Months': [],
      'Older': []
    };

    data.conversations.forEach(conv => {
      const category = getTimeCategory(conv.lastMessage.createdAt);
      groupedConversations[category].push(conv);
    });

    // Generate accordion HTML
    let accordionHtml = '';
    Object.entries(groupedConversations).forEach(([category, convs]) => {
      if (convs.length === 0) return; // Skip empty categories

      const categoryId = category.toLowerCase().replace(/\s+/g, '-');
      const conversationsHtml = convs.map(conv => {
        const user = conv.user || { name: 'Unknown User' };
        const lastMsg = conv.lastMessage;
        const isUnread = conv.unreadCount > 0;
        const time = new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const loadId = conv.conversationId;

        return `
        <div class="conversation-item ${isUnread ? 'unread' : ''}" data-conversation-id="${loadId}" data-conversation-name="${user.name}" id="conv-${loadId}">
            <div class="conversation-avatar">${user.name.charAt(0)}</div>
            <div class="conversation-info">
              <div class="conversation-header">
                <div class="conversation-name">${user.name}</div>
                <div class="conversation-time">${time}</div>
              </div>
              <div class="conversation-preview">
                ${lastMsg.senderId === currentUser.id ? 'You: ' : ''}${lastMsg.content}
              </div>
            </div>
            ${isUnread ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
          </div>
        `;
      }).join('');

      accordionHtml += `
        <div class="conversation-accordion">
          <div class="accordion-header" onclick="toggleConversationAccordion('${categoryId}')">
            <span class="accordion-title">${category} (${convs.length})</span>
            <i class="ri-arrow-down-s-line accordion-icon" id="icon-${categoryId}"></i>
          </div>
          <div class="accordion-content active" id="accordion-${categoryId}">
            ${conversationsHtml}
          </div>
        </div>
      `;
    });

    listEl.innerHTML = `
      <div class="conversations-scroll" style="flex: 1; overflow-y: auto; padding-bottom: 80px;">
        ${accordionHtml}
      </div>
      ${buttonsHtml}
    `;

  } catch (error) {
    console.error('Error loading conversations:', error);
    const listEl = document.getElementById('conversation-list');
    if (listEl) {
      listEl.innerHTML = `
      <div style="padding: 20px; text-align: center; color: red;">
          <p>Error loading messages.</p>
          <button class="btn btn-sm btn-outline-secondary" onclick="loadConversations()">Retry</button>
        </div>
      `;
    }
  }
}

// Load chat history
window.loadChatHistory = async function (id, name, isNewGroup = false) {
  const chatWindow = document.getElementById('chat-window');
  if (!chatWindow) return;

  console.log('Loading chat history for:', id, name);

  // Highlight active conversation
  document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
  const activeItem = document.getElementById(`conv-${id}`);
  if (activeItem) activeItem.classList.add('active');

  // Mobile: Show chat window, hide conversation list
  if (window.innerWidth <= 768) {
    const conversationList = document.querySelector('.conversation-list');
    if (conversationList) {
      conversationList.style.display = 'none';
    }
    chatWindow.style.display = 'flex';
  }

  chatWindow.innerHTML = `
      <div class="chat-header" style="display: flex; justify-content: space-between; align-items: center; padding: var(--spacing-md); border-bottom: 1px solid var(--border-color);">
      <button class="mobile-back-to-list" onclick="showConversationList()" style="display: none; background: transparent; border: none; color: var(--text-primary); font-size: 1.5rem; margin-right: 10px; cursor: pointer; padding: 5px;">
        <i class="ri-arrow-left-line"></i>
      </button>
      <div class="chat-user-info" style="display: flex; align-items: center; gap: 12px;">
        <div class="conversation-avatar">${name.charAt(0)}</div>
        <h3 style="margin: 0;">${name}</h3>
      </div>
      <div class="chat-actions" style="position: relative;">
        <button onclick="toggleChatMenu('${id}', '${name}')" id="chat-menu-btn-${id}" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
          ⋮
        </button>
        <div id="chat-menu-${id}" class="chat-dropdown-menu" style="display: none; position: absolute; right: 0; top: 45px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;">
          <div onclick="handleChatAction('select-delete', '${id}', '${name}')" style="padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
            <span style="color: var(--text-primary);">Delete Selected</span>
          </div>
          <div onclick="handleChatAction('delete-chat', '${id}', '${name}')" style="padding: 12px 16px; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
            <span style="color: #ef4444;">Delete Entire Chat</span>
          </div>
        </div>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages">
      <div style="text-align: center; padding: 20px;">Loading messages...</div>
    </div>
    <div class="chat-input-area">
      <form onsubmit="sendMessage(event, '${id}')" enctype="multipart/form-data" style="display: flex; width: 100%; gap: 10px; align-items: center;">
        <label for="file-input-${id}" class="btn btn-icon" style="cursor: pointer; padding: 8px; border-radius: 50%; background: var(--bg-tertiary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transition: background 0.2s;">
          <span style="font-size: 1.2rem;">📎</span>
        </label>
        <input type="file" id="file-input-${id}" name="attachment" style="display: none;" onchange="updateFileLabel(this, '${id}')">
        <input type="text" id="message-input-${id}" class="chat-input" placeholder="Type a message..." autocomplete="off">
        <button type="submit" class="send-btn" style="cursor: pointer; padding: 8px; border-radius: 50%; background: var(--bg-tertiary); color: var(--text-primary); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transition: background 0.2s; border: 1px solid var(--border-color); font-size: 1.2rem;">➤</button>
      </form>
    </div>
    <div id="file-name-display-${id}" style="font-size: 0.8rem; color: var(--text-muted); padding: 0 var(--spacing-md) var(--spacing-sm) var(--spacing-md); margin-top: -10px;"></div>
  `;

  // Store current conversation ID for sending messages
  chatWindow.setAttribute('data-current-conversation', id);

  try {
    const response = await fetch(`/api/messages/conversation/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    console.log('Chat history response:', data);

    if (data.success) {
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return;

      if (data.messages.length === 0) {
        messagesContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No messages yet. Start the conversation!</div>';
      } else {
        messagesContainer.innerHTML = data.messages.map(msg => {
          const isSent = msg.senderId === currentUser.id;
          const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          let attachmentHtml = '';
          if (msg.attachmentUrl) {
            if (msg.attachmentType === 'image') {
              attachmentHtml = `<div class="message-attachment"><img src="${msg.attachmentUrl}" alt="Attachment" style="max-width: 200px; max-height: 200px; border-radius: 4px; margin-top: 5px; cursor: pointer;" onclick="window.open('${msg.attachmentUrl}', '_blank')"></div>`;
            } else {
              attachmentHtml = `<div class="message-attachment"><a href="${msg.attachmentUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="margin-top: 5px;">📄 Download Document</a></div>`;
            }
          }

          return `
            <div class="message-bubble ${isSent ? 'message-sent' : 'message-received'}">
              ${!isSent && data.conversationId ? `<div class="message-sender" style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">${msg.sender.name}</div>` : ''}
              <div class="message-content">${msg.content}</div>
              ${attachmentHtml}
              <div class="message-time">${time}</div>
            </div>
          `;
        }).join('');
      }

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Removed loadConversations() call here as it causes sidebar to flicker/disappear
      // The unread badges will be cleared on next conversation list refresh
    }
  } catch (error) {
    console.error('Error loading chat history:', error);
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">Error loading messages.</div>';
    }
  }
}

// Toggle chat menu dropdown
window.toggleChatMenu = function (conversationId, name) {
  const menuId = `chat-menu-${conversationId}`;
  const menu = document.getElementById(menuId);

  // Close all other menus first
  document.querySelectorAll('.chat-dropdown-menu').forEach(m => {
    if (m.id !== menuId) m.style.display = 'none';
  });

  // Toggle this menu
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.chat-actions')) {
    document.querySelectorAll('.chat-dropdown-menu').forEach(m => m.style.display = 'none');
  }
});

// Handle chat actions (delete options)
window.handleChatAction = function (action, conversationId, name) {
  // Close the dropdown menu
  const menuId = `chat-menu-${conversationId}`;
  const menu = document.getElementById(menuId);
  if (menu) menu.style.display = 'none';

  if (action === 'select-delete') {
    enableDeleteMode(conversationId);
  } else if (action === 'delete-chat') {
    if (confirm(`Are you sure you want to delete the entire conversation with ${name}?\n\nThis action cannot be undone.`)) {
      deleteChatConversation(conversationId, name);
    }
  }
}

// Enable delete mode for selecting messages
function enableDeleteMode(conversationId) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  // Check if already in delete mode
  if (messagesContainer.classList.contains('delete-mode')) {
    // Exit delete mode
    exitDeleteMode();
    return;
  }

  // Enter delete mode
  messagesContainer.classList.add('delete-mode');

  // Add checkboxes to all messages
  const messageBubbles = messagesContainer.querySelectorAll('.message-bubble');
  messageBubbles.forEach((bubble, index) => {
    bubble.style.position = 'relative';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'message-delete-checkbox';
    checkbox.setAttribute('data-message-index', index);
    checkbox.style.cssText = 'position: absolute; left: -30px; top: 10px; width: 20px; height: 20px; cursor: pointer;';
    bubble.style.marginLeft = '40px';
    bubble.insertBefore(checkbox, bubble.firstChild);
  });

  // Add action buttons at bottom
  const chatInputArea = document.querySelector('.chat-input-area');
  if (chatInputArea) {
    const actionBar = document.createElement('div');
    actionBar.id = 'delete-action-bar';
    actionBar.style.cssText = 'display: flex; gap: 10px; padding: 10px; background: var(--bg-secondary); border-top: 1px solid var(--border-color);';
    actionBar.innerHTML = `
      <button onclick="deleteSelectedMessages('${conversationId}')" class="btn btn-danger" style="flex: 1;">Delete Selected</button>
      <button onclick="exitDeleteMode()" class="btn btn-secondary" style="flex: 1;">Cancel</button>
    `;
    chatInputArea.parentNode.insertBefore(actionBar, chatInputArea);
    chatInputArea.style.display = 'none';
  }
}

// Exit delete mode
window.exitDeleteMode = function () {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  messagesContainer.classList.remove('delete-mode');

  // Remove all checkboxes
  document.querySelectorAll('.message-delete-checkbox').forEach(cb => cb.remove());

  // Reset message margins
  messagesContainer.querySelectorAll('.message-bubble').forEach(bubble => {
    bubble.style.marginLeft = '';
  });

  // Remove action bar and show input area
  const actionBar = document.getElementById('delete-action-bar');
  if (actionBar) actionBar.remove();

  const chatInputArea = document.querySelector('.chat-input-area');
  if (chatInputArea) chatInputArea.style.display = '';
}

// Delete selected messages
window.deleteSelectedMessages = async function (conversationId) {
  const checkboxes = document.querySelectorAll('.message-delete-checkbox:checked');

  if (checkboxes.length === 0) {
    alert('Please select at least one message to delete.');
    return;
  }

  if (!confirm(`Are you sure you want to delete ${checkboxes.length} selected message(s)?\n\nThis action cannot be undone.`)) {
    return;
  }

  // Get message indices to delete
  const indicesToDelete = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-message-index')));

  // Get all messages
  const messagesContainer = document.getElementById('chat-messages');
  const messageBubbles = Array.from(messagesContainer.querySelectorAll('.message-bubble'));

  // Remove selected messages from DOM
  indicesToDelete.sort((a, b) => b - a); // Delete from end to start to preserve indices
  indicesToDelete.forEach(index => {
    if (messageBubbles[index]) {
      messageBubbles[index].remove();
    }
  });

  // Exit delete mode
  exitDeleteMode();

  // Show success message
  alert(`${checkboxes.length} message(s) deleted successfully.`);

  // TODO: Send API request to delete messages from database
  // This is a placeholder - you'll need to implement the backend API
  console.log('Messages to delete:', indicesToDelete);
}

// Delete entire chat conversation
async function deleteChatConversation(conversationId, name) {
  try {
    const response = await fetch(`/api/messages/conversation/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (data.success) {
      alert(`Conversation with ${name} has been deleted.`);
      // Close chat window and show empty state
      const chatWindow = document.getElementById('chat-window');
      if (chatWindow) {
        chatWindow.innerHTML = `
          <div class="empty-state">
            <i style="font-size: 3rem;">💬</i>
            <h3>Select a conversation</h3>
            <p>Choose a user or group from the left to start chatting</p>
            <button class="btn btn-primary mt-3" onclick="startNewConversation()">Start New Chat</button>
          </div>
        `;
      }
      // Reload conversation list
      await loadConversations();
    } else {
      alert('Failed to delete conversation: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    alert('Failed to delete conversation. Please try again.');
  }
}

// Update file label
window.updateFileLabel = function (input, conversationId) {
  const display = document.getElementById(`file-name-display-${conversationId}`);
  if (display && input.files && input.files[0]) {
    display.textContent = `Selected: ${input.files[0].name}`;
  } else if (display) {
    display.textContent = '';
  }
}

// Send message
window.sendMessage = async function (event, conversationId) {
  event.preventDefault();

  const input = document.getElementById(`message-input-${conversationId}`);
  const fileInput = document.getElementById(`file-input-${conversationId}`);
  const content = input.value.trim();
  const file = fileInput.files[0];

  if (!content && !file) return;

  const formData = new FormData();
  formData.append('conversationId', conversationId);
  if (content) formData.append('content', content);
  if (file) formData.append('attachment', file);

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
        // Content-Type is automatically set by browser for FormData
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      input.value = '';
      fileInput.value = ''; // Clear file input
      const fileDisplay = document.getElementById(`file-name-display-${conversationId}`);
      if (fileDisplay) fileDisplay.textContent = '';

      // Append message to chat immediately
      const messagesContainer = document.getElementById('chat-messages');
      if (!messagesContainer) return;

      // Remove "No messages yet" if present
      if (messagesContainer.innerText.includes('No messages yet')) {
        messagesContainer.innerHTML = '';
      }

      let attachmentHtml = '';
      if (data.message.attachmentUrl) {
        if (data.message.attachmentType === 'image') {
          attachmentHtml = `<div class="message-attachment"><img src="${data.message.attachmentUrl}" alt="Attachment" style="max-width: 200px; max-height: 200px; border-radius: 4px; margin-top: 5px; cursor: pointer;" onclick="window.open('${data.message.attachmentUrl}', '_blank')"></div>`;
        } else {
          attachmentHtml = `<div class="message-attachment"><a href="${data.message.attachmentUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="margin-top: 5px;">📄 Download Document</a></div>`;
        }
      }

      const msgDiv = document.createElement('div');
      msgDiv.className = 'message-bubble message-sent';
      msgDiv.innerHTML = `
        <div class="message-content">${data.message.content}</div>
        ${attachmentHtml}
        <div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      `;
      messagesContainer.appendChild(msgDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Note: Not calling loadConversations() here to avoid sidebar flickering
      // Conversation list will update on next natural refresh
    } else {
      console.error('Failed to send message:', data.message);
      alert('Failed to send message: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  }
}

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
