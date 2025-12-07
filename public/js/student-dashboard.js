// Student Dashboard Logic
let currentUser = null;
// Global conversation mappings
let conversations = [];
const conversationDataMap = new Map(); // Store full conversation data by ID
let targetUserId = null; // The student whose dashboard we're viewing
let isAdminView = false; // Whether an admin is viewing this dashboard
let courses = [];
let assignments = [];
let sessions = [];
let messages = [];

// Fallback chart config to prevent ReferenceErrors
const chartConfig = window.chartConfig || {
  colors: { primary: '#1a516f', teal: '#2d7a9e', success: '#00f2fe', warning: '#fee140', danger: '#f5576c' },
  defaultOptions: { responsive: true, maintainAspectRatio: false }
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = checkAuth();
  if (!currentUser) {
    window.location.href = '/';
    return;
  }

  // Expose globally for other functions (like loadConversations) to use
  window.currentUser = currentUser;

  // Check if user is a student or admin, otherwise redirect
  if (currentUser.role !== 'student' && currentUser.role !== 'admin') {
    window.notify.error('You do not have permission to view this page');
    window.location.href = '/';
    return;
  }

  // Get target user ID from URL params (if admin is viewing)
  const urlParams = new URLSearchParams(window.location.search);
  const userIdParam = urlParams.get('userId');

  // Sidebar Toggle Logic
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const body = document.body;

  // Global Sidebar Toggle
  window.toggleGlobalSidebar = function () {
    if (sidebar) {
      sidebar.classList.toggle('expanded');
      body.classList.toggle('sidebar-expanded');
    }
  }

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', window.toggleGlobalSidebar);
  }

  // Determine who we're showing data for
  if (currentUser.role === 'admin' && userIdParam) {
    // Admin viewing a specific student
    targetUserId = userIdParam;
    isAdminView = true;
  } else if (currentUser.role === 'student') {
    // Student viewing their own dashboard
    targetUserId = currentUser.id;  // FIX: Use the logged-in student's ID
    isAdminView = false;
  } else {
    // Invalid access (e.g., professor trying to access student dashboard without permission)
    window.notify.error('You do not have permission to view this page');
    window.location.href = '/';
    return;
  }

  // Fetch and display target student info if admin is viewing
  let studentName = currentUser.name;

  if (isAdminView && targetUserId) {
    try {
      const response = await fetch(`/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      // For now, just show admin's name with indication they're viewing a student
      // TODO: Create /api/users/:id endpoint to fetch student data
      studentName = `Admin (viewing student ${targetUserId})`;

      // Update section subtitle
      const subtitle = document.getElementById('section-subtitle');
      if (subtitle) {
        subtitle.textContent = `Viewing student dashboard as administrator`;
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      // Use current user name as fallback
      studentName = currentUser.name;
    }
  }

  // Display name
  if (document.getElementById('sidebar-user-name')) {
    document.getElementById('sidebar-user-name').textContent = studentName;
  }
  if (document.getElementById('header-user-name')) {
    document.getElementById('header-user-name').textContent = studentName;
  }

  // Show admin banner if admin is viewing
  if (isAdminView) {
    const banner = document.getElementById('admin-banner');
    if (banner) {
      banner.style.display = 'flex';
    }
  }

  // Set up navigation
  setupNavigation();

  // Load initial data
  await loadAllData();
});

// Setup navigation
function setupNavigation() {
  const navLinksContainer = document.querySelector('.nav-links');
  if (!navLinksContainer) return;

  navLinksContainer.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;

    e.preventDefault();
    const sectionName = item.dataset.section;
    console.log('Navigating to:', sectionName);

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    // Update active section
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
      targetSection.classList.add('active');
    } else {
      console.error(`Section not found: #${sectionName}-section`);
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
}

// Update header based on section
function updateHeader(sectionName) {
  const header = document.querySelector('.dashboard-header');

  if (sectionName === 'messages') {
    if (header) header.style.display = 'none';
    return;
  }

  if (header) header.style.display = 'flex';

  const titles = {
    overview: 'Dashboard Overview',
    courses: 'My Courses',
    assignments: 'My Assignments',
    quizzes: 'My Quizzes',
    sessions: 'Class Sessions',
    classrooms: 'Online Classrooms',
    messages: 'Messages',
    'study-buddy': 'AI Study Buddy'
  };

  const subtitles = {
    overview: 'Welcome back to your learning portal',
    courses: 'View and manage your enrolled courses',
    assignments: 'Complete and track your assignments',
    quizzes: 'Take online quizzes and view results',
    sessions: 'Join and schedule your online classes',
    classrooms: 'Join live online classroom sessions',
    messages: 'Communicate with your professors'
  };

  const titleElement = document.getElementById('section-title');
  if (titleElement) titleElement.textContent = titles[sectionName] || sectionName;
}

// Load all data
async function loadAllData() {
  console.log('🚀 loadAllData: Starting data fetch...');
  try {
    console.log('📡 Fetching Courses, Assignments, Sessions, Messages...');
    const [coursesRes, assignmentsRes, sessionsRes, messagesRes] = await Promise.all([
      api.getCourses(),
      api.getAssignments(),
      api.getSessions(),
      api.getMessages()
    ]);

    console.log('📦 Data Received:', {
      courses: coursesRes.courses?.length,
      assignments: assignmentsRes.assignments?.length,
      sessions: sessionsRes.sessions?.length,
      messages: messagesRes.messages?.length
    });

    courses = coursesRes.courses || [];
    assignments = assignmentsRes.assignments || [];
    sessions = sessionsRes.sessions || [];
    messages = messagesRes.messages || [];

    // === MOCK DATA FALLBACK (DEBUGGING) ===
    if (courses.length === 0 && assignments.length === 0) {
      console.warn('⚠️ No data found. Injecting MOCK DATA to verify UI.');
      if (window.notify) window.notify.warning('Database empty. Showing DEMO data.');

      // Create Mock Course enrolled by current user
      courses = [{
        id: 999,
        title: "Demo Course (Debug)",
        name: "Demo Course (Debug)",
        professor: { name: "Test Professor" },
        students: [{ id: targetUserId, name: "Me" }]
      }];

      // Create Mock Assignment
      assignments = [{
        id: 999,
        title: "Demo Assignment",
        dueDate: new Date().toISOString(),
        course: { name: "Demo Course (Debug)" },
        submissions: [] // Pending
      }];
    }
    // ======================================

    renderOverview();
    console.log('✅ loadAllData completed successfully');
  } catch (error) {
    console.error('❌ Error loading data:', error);
    // Show visible error to user if "connection" is suspected
    const statsContainer = document.querySelector('.stats-grid');
    if (statsContainer) {
      statsContainer.innerHTML = `<div style="grid-column: 1/-1; padding: 20px; color: #ef4444; background: rgba(239,68,68,0.1); border-radius: 8px;">
            <i class="ri-error-warning-line"></i> Connection Error: Failed to load dashboard stats. Please try refreshing.
        </div>`;
    }
  }
}

// Explicit Connection Check
async function checkBackendConnection() {
  console.log('🔄 Checking backend connection...');
  try {
    const start = Date.now();
    await api.getCurrentUser();
    const duration = Date.now() - start;
    console.log(`✅ Backend Connected! (Latency: ${duration}ms)`);

    // Optional: Show a subtle toast if previously disconnected
    // if(window.notify) window.notify.success('Connected to server');
  } catch (err) {
    console.error('❌ Backend Connection Failed:', err);
    if (window.notify) window.notify.error('Cannot connect to server');
  }
}

// Run prompt check
checkBackendConnection();

// Load section data
async function loadSectionData(sectionName) {
  switch (sectionName) {
    case 'courses':
      renderCourses();
      break;
    case 'assignments':
      renderAssignments();
      break;
    case 'quizzes':
      renderQuizzes();
      break;
    case 'sessions':
      renderSessions();
      break;
    case 'classrooms':
      if (typeof loadStudentClassrooms === 'function') {
        await loadStudentClassrooms();
      }
      break;
    case 'messages':
      renderMessages();
      break;
  }
}

// Render overview
function renderOverview() {
  console.log('✅ renderOverview called');

  // Update stats
  const enrolledCourses = courses.filter(c => {
    const isEnrolled = c.students?.some(s => {
      const sId = s.id || s;
      return String(sId) === String(targetUserId);
    });
    return isEnrolled;
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  };

  // === VISIBLE DEBUG PANEL (TEMPORARY) ===
  const dashboardHeader = document.querySelector('.dashboard-header');
  if (dashboardHeader && !document.getElementById('debug-panel')) {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = 'background: #333; color: #0f0; padding: 10px; margin-bottom: 20px; border-radius: 8px; font-family: monospace; font-size: 12px; width: 100%;';
    debugPanel.innerHTML = `
        <strong>🛠️ DEBUG STATUS:</strong><br/>
        User ID: ${targetUserId} (Type: ${typeof targetUserId})<br/>
        Total Courses Fetched: ${courses.length}<br/>
        Enrolled Courses: ${enrolledCourses.length}<br/>
        Pending Assignments: ${assignments.filter(a => !a.submissions?.some(s => String(s.student || s) === String(targetUserId))).length}<br/>
        Token Present: ${!!localStorage.getItem('token') ? 'Yes' : 'No'}
      `;
    dashboardHeader.parentNode.insertBefore(debugPanel, dashboardHeader.nextSibling);
  } else if (document.getElementById('debug-panel')) {
    document.getElementById('debug-panel').innerHTML = `
        <strong>🛠️ DEBUG STATUS:</strong><br/>
        User ID: ${targetUserId} (Type: ${typeof targetUserId})<br/>
        Total Courses Fetched: ${courses.length}<br/>
        Enrolled Courses: ${enrolledCourses.length}<br/>
        Pending Assignments: ${assignments.filter(a => !a.submissions?.some(s => String(s.student || s) === String(targetUserId))).length}<br/>
        Token Present: ${!!localStorage.getItem('token') ? 'Yes' : 'No'}
      `;
  }
  // =======================================

  document.getElementById('enrolled-count').textContent = enrolledCourses.length;

  const pendingAssignments = assignments.filter(a => {
    // Debug assignment filtering if needed
    return !a.submissions?.some(s => {
      const sId = s.student || s;
      return String(sId) === String(targetUserId);
    });
  });
  document.getElementById('pending-assignments').textContent = pendingAssignments.length;

  const upcomingSessions = sessions.filter(s => new Date(s.scheduledAt) > new Date());
  document.getElementById('upcoming-sessions').textContent = upcomingSessions.length;

  const unreadMessages = messages.filter(m => m.receiver?.id === targetUserId && !m.isRead);
  document.getElementById('unread-messages').textContent = unreadMessages.length;

  // Recent assignments
  const recentAssignments = assignments.slice(0, 3);
  const recentAssignmentsEl = document.getElementById('recent-assignments');
  if (recentAssignments.length) {
    recentAssignmentsEl.innerHTML = recentAssignments.map(a => `
      <div class="assignment-item mb-2" style="padding: var(--spacing-sm);">
        <div class="item-title" style="font-size: 1rem;">${a.title}</div>
        <div class="item-footer">
          <span>📚 ${a.course?.name || 'Course'}</span>
          <span>📅 Due: ${new Date(a.dueDate).toLocaleDateString()}</span>
        </div>
      </div>
    `).join('');
  }

  // Upcoming sessions list
  const upcomingSessionsList = upcomingSessions.slice(0, 3);
  const upcomingSessionsEl = document.getElementById('upcoming-sessions-list');
  if (upcomingSessionsList.length) {
    upcomingSessionsEl.innerHTML = upcomingSessionsList.map(s => `
      <div class="session-item mb-2" style="padding: var(--spacing-sm);">
        <div class="item-title" style="font-size: 1rem;">${s.title}</div>
        <div class="item-footer">
          <span>📚 ${s.course?.name || 'Course'}</span>
          <span>🕐 ${new Date(s.scheduledAt).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  }

  // Initialize analytics charts
  initializeCharts(enrolledCourses);

  // Generate AI insights
  generateAIInsights(enrolledCourses);
}

// Generate AI-powered insights
function generateAIInsights(enrolledCourses) {
  const insights = [];

  // Check password expiry
  if (currentUser && currentUser.lastPasswordChange) {
    const lastChange = new Date(currentUser.lastPasswordChange);
    const daysSinceChange = Math.floor((new Date() - lastChange) / (1000 * 60 * 60 * 24));
    const daysUntilExpiry = 90 - daysSinceChange;

    if (daysUntilExpiry <= 7) {
      insights.push({
        type: 'critical',
        icon: 'ri-lock-password-line',
        title: 'Password Expiring Soon!',
        desc: `Your password will expire in ${daysUntilExpiry} days. Please update it to maintain account security.`,
        action: { text: 'Change Password', onclick: 'changePassword()' }
      });
    } else if (daysUntilExpiry <= 14) {
      insights.push({
        type: 'warning',
        icon: 'ri-lock-password-line',
        title: 'Password Expiry Reminder',
        desc: `Your password will expire in ${daysUntilExpiry} days.`,
        action: { text: 'Change Password', onclick: 'changePassword()' }
      });
    }
  }

  // Check pending assignments
  const pendingAssignments = assignments.filter(a => {
    const hasSubmitted = a.submissions?.some(s => s.student === targetUserId);
    const isPastDue = new Date(a.dueDate) < new Date();
    return !hasSubmitted && !isPastDue;
  });

  if (pendingAssignments.length > 0) {
    const urgentCount = pendingAssignments.filter(a => {
      const daysUntilDue = Math.ceil((new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 3;
    }).length;

    if (urgentCount > 0) {
      insights.push({
        type: 'critical',
        icon: 'ri-file-list-3-line',
        title: `${urgentCount} Urgent Assignment${urgentCount > 1 ? 's' : ''}`,
        desc: `You have ${urgentCount} assignment${urgentCount > 1 ? 's' : ''} due within 3 days. Submit them soon to avoid late penalties.`,
        action: { text: 'View Assignments', onclick: 'switchToSection("assignments")' }
      });
    } else {
      insights.push({
        type: 'warning',
        icon: 'ri-file-list-3-line',
        title: `${pendingAssignments.length} Pending Assignment${pendingAssignments.length > 1 ? 's' : ''}`,
        desc: `You have ${pendingAssignments.length} assignment${pendingAssignments.length > 1 ? 's' : ''} to complete.`,
        action: { text: 'View Assignments', onclick: 'switchToSection("assignments")' }
      });
    }
  }

  // Check low performance areas
  const mySubmissions = assignments.filter(a =>
    a.submissions?.some(s => s.student === targetUserId)
  );

  const lowScores = mySubmissions.filter(a => {
    const sub = a.submissions.find(s => s.student === targetUserId);
    return sub && sub.grade && sub.grade < 60;
  });

  if (lowScores.length > 0) {
    const coursesNeedingWork = [...new Set(lowScores.map(a => a.course?.name).filter(Boolean))];
    insights.push({
      type: 'warning',
      icon: 'ri-alert-line',
      title: 'Areas Needing Improvement',
      desc: `You have low scores in: ${coursesNeedingWork.join(', ')}. Consider reviewing these topics or reaching out to your professor.`,
      action: { text: 'Contact Professor', onclick: 'switchToSection("messages")' }
    });
  }

  // Check unread messages
  const unreadMessages = messages.filter(m => m.receiver?.id === targetUserId && !m.isRead);
  if (unreadMessages.length > 0) {
    insights.push({
      type: 'info',
      icon: 'ri-mail-unread-line',
      title: `${unreadMessages.length} Unread Message${unreadMessages.length > 1 ? 's' : ''}`,
      desc: unreadMessages.length > 1 ?
        'You have new messages from your professors.' :
        `New message from ${unreadMessages[0].sender?.name || 'your professor'}.`,
      action: { text: 'View Messages', onclick: 'switchToSection("messages")' }
    });
  }

  // Check upcoming sessions
  const upcomingSessions = sessions.filter(s => {
    const sessionDate = new Date(s.scheduledAt);
    const now = new Date();
    const hoursUntil = (sessionDate - now) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 24;
  });

  if (upcomingSessions.length > 0) {
    insights.push({
      type: 'info',
      icon: 'ri-calendar-event-line',
      title: 'Upcoming Sessions Today',
      desc: `You have ${upcomingSessions.length} session${upcomingSessions.length > 1 ? 's' : ''} scheduled within the next 24 hours.`,
      action: { text: 'View Schedule', onclick: 'switchToSection("sessions")' }
    });
  }

  // Check enrollment status
  if (enrolledCourses.length === 0) {
    insights.push({
      type: 'warning',
      icon: 'ri-book-open-line',
      title: 'No Courses Enrolled',
      desc: 'You are not enrolled in any courses yet. Enroll in courses to start your learning journey!',
      action: { text: 'Browse Courses', onclick: 'switchToSection("courses")' }
    });
  }

  // Positive reinforcement
  if (insights.length === 0 || !insights.some(i => i.type === 'critical' || i.type === 'warning')) {
    const avgScore = mySubmissions.length > 0 ?
      mySubmissions.reduce((sum, a) => {
        const sub = a.submissions.find(s => s.student === targetUserId);
        return sum + (sub?.grade || 0);
      }, 0) / mySubmissions.length : 0;

    if (avgScore >= 80) {
      insights.push({
        type: 'success',
        icon: 'ri-trophy-line',
        title: 'Excellent Performance!',
        desc: `You're maintaining an average score of ${avgScore.toFixed(1)}%. Keep up the great work!`
      });
    }
  }

  // Mobile: Show chat window (only if element exists)
  const chatContainer = document.querySelector('.chat-container-modern');
  if (chatContainer) {
    chatContainer.classList.add('mobile-chat-active');
  }

  // Render insights
  renderAIInsights(insights);
}

// Mobile: Close chat and return to list
window.closeMobileChat = function () {
  document.querySelector('.chat-container-modern').classList.remove('mobile-chat-active');
}

// Render AI insights
function renderAIInsights(insights) {
  const container = document.getElementById('ai-insights-content');
  if (!container) return;

  if (insights.length === 0) {
    container.innerHTML = `
      <div class="ai-insight-item success">
        <i class="ri-check-double-line"></i>
        <div class="ai-insight-content-text">
          <div class="ai-insight-title">All Caught Up!</div>
          <div class="ai-insight-desc">You're doing great! No urgent items need your attention right now.</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = insights.map(insight => `
    <div class="ai-insight-item ${insight.type}" style="display: flex; align-items: flex-start; gap: 12px;">
      <div class="icon-wrapper" style="flex-shrink: 0;">
        <i class="${insight.icon}"></i>
      </div>
      <div class="ai-insight-content-text" style="flex: 1;">
        <div class="ai-insight-title" style="font-weight: 600; margin-bottom: 4px;">${insight.title}</div>
        <div class="ai-insight-desc" style="font-size: 0.9rem; color: var(--text-muted);">${insight.desc}</div>
        ${insight.action ? `
          <div class="ai-insight-action" style="margin-top: 8px;">
            <button class="btn btn-sm btn-primary" onclick="${insight.action.onclick}">${insight.action.text}</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Render quizzes
async function renderQuizzes() {
  const quizzesEl = document.getElementById('quizzes-list');
  quizzesEl.innerHTML = '<p class="text-muted">Loading quizzes...</p>';

  let allQuizzes = [];

  // Fetch quizzes for all enrolled courses
  const enrolledCourses = courses.filter(c => c.students?.some(s => s.id === targetUserId));

  for (const course of enrolledCourses) {
    try {
      const res = await api.getQuizzesByCourse(course.id);
      if (res.success) {
        allQuizzes = [...allQuizzes, ...res.quizzes.map(q => ({ ...q, courseName: course.name }))];
      }
    } catch (e) { console.error(e); }
  }

  if (!allQuizzes.length) {
    quizzesEl.innerHTML = '<p class="text-muted">No quizzes available yet.</p>';
    return;
  }

  quizzesEl.innerHTML = allQuizzes.map(q => {
    const isClosed = q.status === 'closed' || (q.closesAt && new Date(q.closesAt) < new Date());
    const statusBadge = isClosed
      ? '<span class="badge badge-danger">Closed</span>'
      : '<span class="badge badge-success">Active</span>';

    return `
      <div class="assignment-item">
        <div class="item-header">
          <div>
            <div class="item-title">${q.title}</div>
            <div class="item-description">${q.topic}</div>
          </div>
          ${statusBadge}
        </div>
        <div class="item-footer">
          <span><i class="ri-book-open-line"></i> ${q.courseName}</span>
          <span><i class="ri-questionnaire-line"></i> ${q.questions.length} Questions</span>
          <span><i class="ri-timer-line"></i> ${q.timeLimit} mins</span>
          ${q.closesAt ? `<span><i class="ri-time-line"></i> Closes: ${new Date(q.closesAt).toLocaleString()}</span>` : ''}
        </div>
        <div class="mt-2">
            <a href="/student/quiz-player.html?token=${q.accessToken}" class="btn btn-primary btn-sm">
                ${isClosed ? 'View Results' : 'Take Quiz'}
            </a>
        </div>
      </div>
    `;
  }).join('');
}

// Switch to a specific section
window.switchToSection = function (sectionName) {
  const navItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
  if (navItem) {
    navItem.click();
  }
}

// Initialize all analytics charts
function initializeCharts(enrolledCourses) {
  // Attendance Chart
  renderAttendanceChart(enrolledCourses);

  // Assignment Scores Chart
  renderAssignmentScoresChart();

  // Performance Radar Chart
  renderPerformanceRadarChart();

  // Course Progress Chart
  renderCourseProgressChart(enrolledCourses);
}

// Render Attendance Chart
function renderAttendanceChart(enrolledCourses) {
  const ctx = document.getElementById('attendanceChart');
  if (!ctx) return;

  // Sample data - in real app, fetch from backend
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'];
  const attendanceData = [90, 85, 95, 100, 80, 90]; // Percentage

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Attendance Rate (%)',
        data: attendanceData,
        borderColor: chartConfig.colors.primary,
        backgroundColor: 'rgba(26, 81, 111, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: chartConfig.colors.primary
      }]
    },
    options: {
      ...chartConfig.defaultOptions,
      scales: {
        ...chartConfig.defaultOptions.scales,
        y: {
          ...chartConfig.defaultOptions.scales.y,
          max: 100,
          ticks: {
            ...chartConfig.defaultOptions.scales.y.ticks,
            callback: value => value + '%'
          }
        }
      }
    }
  });
}

// Render Assignment Scores Chart
function renderAssignmentScoresChart() {
  const ctx = document.getElementById('assignmentScoresChart');
  if (!ctx) return;

  // Sample data - get actual scores from assignments
  const myAssignments = assignments.filter(a =>
    a.submissions?.some(s => s.student === targetUserId)
  );

  const labels = myAssignments.slice(0, 8).map((a, i) => `A${i + 1}`);
  const scores = myAssignments.slice(0, 8).map(a => {
    const sub = a.submissions.find(s => s.student === targetUserId);
    return sub?.grade || 0;
  });

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        label: 'Score (%)',
        data: scores.length ? scores : [0],
        backgroundColor: chartConfig.colors.teal,
        borderRadius: 8,
        borderWidth: 0
      }]
    },
    options: {
      ...chartConfig.defaultOptions,
      scales: {
        ...chartConfig.defaultOptions.scales,
        y: {
          ...chartConfig.defaultOptions.scales.y,
          max: 100,
          ticks: {
            ...chartConfig.defaultOptions.scales.y.ticks,
            callback: value => value + '%'
          }
        }
      }
    }
  });
}

// Render Performance Radar Chart
function renderPerformanceRadarChart() {
  const ctx = document.getElementById('performanceRadarChart');
  if (!ctx) return;

  // Sample performance metrics
  const data = {
    labels: ['Attendance', 'Assignments', 'Participation', 'Punctuality', 'Overall'],
    datasets: [{
      label: 'My Performance',
      data: [88, 92, 85, 90, 87],
      backgroundColor: 'rgba(26, 81, 111, 0.2)',
      borderColor: chartConfig.colors.primary,
      borderWidth: 2,
      pointBackgroundColor: chartConfig.colors.primary,
      pointBorderColor: '#fff',
      pointRadius: 5
    }]
  };

  new Chart(ctx, {
    type: 'radar',
    data: data,
    options: {
      ...chartConfig.defaultOptions,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted')
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          pointLabels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// Render Course Progress Chart
function renderCourseProgressChart(enrolledCourses) {
  const ctx = document.getElementById('courseProgressChart');
  if (!ctx) return;

  const labels = enrolledCourses.slice(0, 5).map(c => c.name.substring(0, 15) + (c.name.length > 15 ? '...' : ''));
  const progressData = enrolledCourses.slice(0, 5).map(() => Math.floor(Math.random() * 40) + 60); // Sample: 60-100%

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No Courses'],
      datasets: [{
        data: progressData.length ? progressData : [100],
        backgroundColor: chartConfig.colors.teal,
        borderWidth: 0
      }]
    },
    options: {
      ...chartConfig.defaultOptions,
      cutout: '60%',
      plugins: {
        ...chartConfig.defaultOptions.plugins,
        legend: {
          ...chartConfig.defaultOptions.plugins.legend,
          position: 'right'
        }
      }
    }
  });
}

// Render courses
function renderCourses() {
  const enrolledCourses = courses.filter(c => c.students?.some(s => s.id === targetUserId));
  const coursesEl = document.getElementById('courses-list');

  if (!enrolledCourses.length) {
    coursesEl.innerHTML = '<p class="text-muted">You are not enrolled in any courses yet. Click "Enroll in Course" to get started!</p>';
    return;
  }

  coursesEl.innerHTML = enrolledCourses.map(course => `
    <div class="course-card">
      <div class="course-header">
        <h3 class="course-title">${course.name}</h3>
        <span class="badge badge-success">Enrolled</span>
      </div>
      <p class="item-description">${course.description}</p>
      <div class="course-meta">
      <div class="course-meta">
        <div class="meta-item"><i class="ri-user-star-line"></i> ${course.professor?.name || 'Professor'}</div>
        <div class="meta-item"><i class="ri-group-line"></i> ${course.students?.length || 0} students</div>
        <div class="meta-item"><i class="ri-time-line"></i> ${course.duration}</div>
      </div>
      </div>
    </div>
  `).join('');
}

// Render assignments
function renderAssignments() {
  const assignmentsEl = document.getElementById('assignments-list');

  if (!assignments.length) {
    assignmentsEl.innerHTML = '<p class="text-muted">No assignments available yet.</p>';
    return;
  }

  assignmentsEl.innerHTML = assignments.map(assignment => {
    const mySubmission = assignment.submissions?.find(s => s.student === targetUserId);
    const isSubmitted = !!mySubmission;

    return `
      <div class="assignment-item">
        <div class="item-header">
          <div>
            <div class="item-title">${assignment.title}</div>
            <div class="item-description">${assignment.description}</div>
          </div>
          ${isSubmitted ?
        `<span class="badge badge-success">Submitted${mySubmission.grade ? ` - ${mySubmission.grade}%` : ''}</span>` :
        `<span class="badge badge-warning">Pending</span>`
      }
        </div>
        <div class="item-footer">
          <span><i class="ri-book-open-line"></i> ${assignment.course?.name || 'Course'}</span>
          <span><i class="ri-calendar-event-line"></i> Due: ${new Date(assignment.dueDate).toLocaleDateString()}</span>
          <span><i class="ri-trophy-line"></i> Max Score: ${assignment.maxScore}</span>
        </div>
        ${!isSubmitted ?
        `<button class="btn btn-primary btn-sm mt-2" onclick="showSubmitAssignment('${assignment.id}')">Submit Assignment</button>` :
        mySubmission.feedback ? `<div class="mt-2"><strong>Feedback:</strong> ${mySubmission.feedback}</div>` : ''
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
          <span><i class="ri-user-star-line"></i> ${session.professor?.name || 'Professor'}</span>
          <span><i class="ri-time-line"></i> ${new Date(session.scheduledAt).toLocaleString()}</span>
          <span><i class="ri-timer-line"></i> ${session.duration} min</span>
        </div>
        ${session.meetingLink ?
        `<a href="${session.meetingLink}" target="_blank" class="btn btn-primary btn-sm mt-2">Join Meeting</a>` : ''
      }
      </div>
    `;
  }).join('');
}

// Render messages (Chat Interface)
// Render messages (Chat Interface)
async function renderMessages() {
  const messagesEl = document.getElementById('messages-list');

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
              <!-- Stories removed -->
              <div class="chat-list" id="conversation-list">
                  <div style="padding: 20px; text-align: center; color: var(--chat-text-muted);">Loading...</div>
              </div>
              
              <!-- Fixed Sidebar Footer -->
              <div class="chat-sidebar-footer" style="padding: 16px; border-top: 1px solid var(--chat-border);">
                  <button class="btn-new-chat" onclick="startNewConversation()">
                      <i class="ri-add-line"></i> Create New
                  </button>
              </div>
          </div>


          <!-- Main Chat -->
          <div class="chat-main" id="chat-window">
              <div class="chat-header" id="chat-header" style="visibility: hidden; position: relative;">
                  
                  <!-- Normal Header Content -->
                  <div class="header-content" style="display: flex; flex: 1; align-items: center;">
                      <div class="header-user" onclick="toggleDetails()" style="flex: 1; overflow: hidden; display: flex; align-items: center; gap: 10px;">
                          <button class="mobile-back-btn" onclick="event.stopPropagation(); closeMobileChat()">
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
                                  <button class="dropdown-item" onclick="toggleSelectionMode()">
                                      <i class="ri-checkbox-multiple-line"></i> Select Messages
                                  </button>
                                  <button class="dropdown-item danger" onclick="deleteCompleteChat()">
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
                  <input type="file" id="file-input" style="display: none;">
                  
                  <div class="input-wrapper">
                      <input type="text" placeholder="Type a message..." id="message-input" onkeypress="handleKeyPress(event)">
                      <button class="btn-emoji">
                          <i class="ri-emotion-line"></i>
                      </button>
                  </div>
                  
                  <button class="btn-send" onclick="sendMessage()">
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
                          <p style="font-size: 0.9rem; line-height: 1.5; color: var(--chat-text-muted);">
                              Infuriatingly humble travel expert. Social media fanatic. Explorer. Come chat with me 🤩
                          </p>
                      </div>
                      <div class="info-row">
                          <i class="ri-phone-line"></i>
                          <span>+1 234 567 890</span>
                      </div>
                      <div class="info-row">
                          <i class="ri-mail-line"></i>
                          <span>user@example.com</span>
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
                          <div class="media-thumb" style="position: relative;">
                              <div style="position: absolute; inset:0; background: rgba(0,0,0,0.5); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">+5</div>
                          </div>
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

// Show available courses modal
async function showAvailableCourses() {
  try {
    const response = await api.getCourses();
    const allCourses = response.courses || [];
    const availableCourses = allCourses.filter(c =>
      !c.students?.some(s => s.id === targetUserId)
    );

    const modal = `
      <div class="modal" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h2>Available Courses</h2>
            <button class="modal-close" onclick="closeModal(event)">×</button>
          </div>
          ${availableCourses.length ?
        availableCourses.map(course => `
              <div class="card mb-3">
                <h4>${course.name}</h4>
                <p>${course.description}</p>
                <div class="flex-between">
                  <span><i class="ri-user-star-line"></i> ${course.professor?.name || 'Professor'}</span>
                  <button class="btn btn-primary btn-sm" onclick="enrollInCourse('${course.id}')">Enroll</button>
                </div>
              </div>
            `).join('') :
        '<p class="text-muted">No available courses at the moment.</p>'
      }
        </div>
      </div>
    `;

    document.getElementById('modal-container').innerHTML = modal;
  } catch (error) {
    window.notify.error('Error loading courses: ' + error.message);
  }
}

// Enroll in course
async function enrollInCourse(courseId) {
  try {
    // Prepare request body
    const requestBody = {};

    // If admin is viewing, send the student ID in the body
    if (isAdminView && targetUserId) {
      requestBody.studentId = targetUserId;
      console.log('Admin enrolling student', targetUserId, 'in course', courseId);
    } else {
      console.log('Student self-enrolling in course', courseId);
    }

    const response = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (data.success) {
      window.notify.success(isAdminView ? 'Student enrolled successfully!' : 'Successfully enrolled in course!');
      closeModal();
      await loadAllData();
      renderCourses();
    } else {
      window.notify.error(data.message || 'Error enrolling in course');
    }
  } catch (error) {
    console.error('Error enrolling in course:', error);
    window.notify.error('Error enrolling in course: ' + error.message);
  }
}

// Show submit assignment modal
function showSubmitAssignment(assignmentId) {
  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Submit Assignment</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="submitAssignment(event, '${assignmentId}')">
          <div class="form-group">
            <label>Your Submission</label>
            <textarea id="submission-content" rows="6" placeholder="Enter your answer or solution here..." required></textarea>
          </div>
          <div class="form-group">
            <label>File URL (Optional)</label>
            <input type="url" id="submission-file" placeholder="https://example.com/your-file.pdf">
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
}

// Submit assignment
async function submitAssignment(e, assignmentId) {
  e.preventDefault();
  const content = document.getElementById('submission-content').value;
  const fileUrl = document.getElementById('submission-file').value;

  try {
    const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        content,
        fileUrl,
        studentId: isAdminView ? targetUserId : undefined // Admin submitting on behalf
      })
    });

    const data = await response.json();
    if (data.success) {
      window.notify.success(isAdminView ? 'Assignment submitted for student!' : 'Assignment submitted successfully!');
      closeModal();
      await loadAllData();
      renderAssignments();
    } else {
      window.notify.error(data.message || 'Error submitting assignment');
    }
  } catch (error) {
    console.error('Error submitting assignment:', error);
    window.notify.error('Error submitting assignment: ' + error.message);
  }
}



// Send message
async function sendMessage(e) {
  e.preventDefault();
  const receiverEmail = document.getElementById('message-receiver').value;
  const subject = document.getElementById('message-subject').value;
  const content = document.getElementById('message-content').value;

  try {
    // Note: In a real app, you'd look up the receiver by email first
    // For now, we'll show an alert that the API expects receiver ID
    window.notify.info('Note: Message sending requires professor ID. Please contact your professor directly or they will message you first.');
    closeModal();
  } catch (error) {
    console.error('Error sending message:', error);
    window.notify.error('Error sending message: ' + error.message);
  }
}

// Chat Helper Functions

// Load conversations with Stories strip
async function loadConversations() {
  try {
    const response = await fetch('/api/messages/conversations', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();

    if (data.success) {
      const conversationList = document.getElementById('conversation-list');
      if (!conversationList) return;

      // We need to preserve the wrapper structure if we replace innerHTML
      // Let's assume conversation-list is the scrolling part. We might need to target the parent specificially.
      // Actually, let's target the parent container for the full sidebar render if possible, or just prepend.
      // Better: Update renderMessages structure to include a separate container for list vs header? 
      // Current ID 'conversation-list' is the flex container. Let's effectively rebuild the sidebar content here.

      const listHTML = data.conversations.length === 0
        ? '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No conversations yet</div>'
        : data.conversations.map(conv => {
          // Backend returns: { conversationId, type, user: { name, img, ... }, lastMessage, unreadCount }
          // We need to map this to the UI

          let name = 'Unknown User';
          let avatar = '/images/avatar-placeholder.png';
          let status = 'offline';
          const convId = conv.conversationId; // Correct property from backend

          if (conv.user) {
            name = conv.user.name || 'Unknown User';
            // If we had avatar in backend, we'd use it here
          } else if (conv.name) {
            name = conv.name;
          }

          const lastMessage = conv.lastMessage ? (conv.lastMessage.content.length > 25 ? conv.lastMessage.content.substring(0, 25) + '...' : conv.lastMessage.content) : 'No messages';
          // Fix date parsing if needed
          const time = conv.lastMessage && conv.lastMessage.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const unreadCount = conv.unreadCount || 0;
          const isActive = window.currentConversationId == convId ? 'active' : '';

          // Store full conversation data in global map
          conversationDataMap.set(String(convId), conv);

          return `
            <div class="chat-item ${isActive}" onclick="loadChatHistory('${convId}', '${(name || '').replace(/'/g, "\\'")}')" data-conversation-id="${convId}">
                <div class="avatar-wrapper">
                    <img src="${avatar}" alt="${name}" class="avatar-img">
                    ${unreadCount > 0 ? `<div class="status-dot status-online" style="border-color: #fff;"></div>` : ''} 
                </div>
                <div class="chat-info">
                    <div class="chat-name-row">
                        <span class="chat-name">${name}</span>
                        <span class="chat-time">${time}</span>
                    </div>
                    <div class="chat-name-row">
                        <span class="chat-preview" style="${unreadCount > 0 ? 'color: var(--text-primary); font-weight: 500;' : ''}">${lastMessage}</span>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        }).join('');

      conversationList.innerHTML = listHTML;

      // Note: openCreateGroupModal is generic, startNewConversation() is for direct. 
      // Design has just "+ Create New". Let's use startNewConversation as default.
    } else {
      console.error('Failed to load conversations:', data.message);
      const conversationList = document.getElementById('conversation-list');
      if (conversationList) {
        conversationList.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--error-color, red);">Error: ${data.message}</div>`;
      }
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    const conversationList = document.getElementById('conversation-list');
    if (conversationList) {
      conversationList.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--error-color, red);">Failed to load chats. Please refresh.</div>`;
    }
  }
}

// Load chat history with Toggle Logic
async function loadChatHistory(conversationId, conversationName, isNewGroup = false) {
  window.currentConversationId = conversationId;

  // Update active state
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.conversationId === conversationId) item.classList.add('active');
  });

  // Get user details from stored conversation data
  const convData = conversationDataMap.get(String(conversationId));
  const chatUser = convData?.user || { name: conversationName };
  console.log('🔍 Loading chat for:', conversationId, 'User data:', chatUser);

  // Layout Elements
  const chatHeader = document.getElementById('chat-header');
  const messagesContainer = document.getElementById('messages-container');
  const detailsPane = document.getElementById('chat-details-pane');

  // Update Header
  if (chatHeader) {
    chatHeader.style.visibility = 'visible';
    //Use the robust structure with Search and Dropdown
    chatHeader.innerHTML = `
        <div class="header-content" style="display: flex; flex: 1; align-items: center;">
            <div class="header-user" onclick="toggleDetails()" style="flex: 1; overflow: hidden; display: flex; align-items: center; gap: 10px;">
                <button class="mobile-back-btn" onclick="event.stopPropagation(); closeMobileChat()">
                  <i class="ri-arrow-left-line"></i>
                </button>
                <div class="avatar-wrapper">
                     <img src="/images/avatar-placeholder.png" class="avatar-img">
                     <div class="status-dot status-online"></div>
                </div>
                <div style="min-width: 0;">
                    <h3 class="chat-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${conversationName}</h3>
                    <div class="chat-time" style="text-align: left; color: #10b981;">Online</div>
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
                        <button class="dropdown-item" onclick="toggleSelectionMode()">
                            <i class="ri-checkbox-multiple-line"></i> Select Messages
                        </button>
                        <button class="dropdown-item danger" onclick="deleteCompleteChat()">
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
    `;
  }

  // Load Messages
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
      console.log('DEBUG: Loaded messages:', data.messages.length);
      console.log('DEBUG: currentUser:', currentUser);

      if (data.messages.length === 0) {
        messagesContainer.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.7;">No messages yet.</div>';
      } else {
        data.messages.forEach((msg, index) => {
          // Log specific message if it causes issues
          if (!msg.sender) console.warn(`DEBUG: Message ${index} has no sender:`, msg);

          const currentUserId = currentUser ? currentUser.id : null;
          const senderId = msg.sender ? msg.sender.id : null;

          if (!currentUserId) console.error('CRITICAL: currentUser is null inside loadChatHistory!');

          const isMe = currentUserId && senderId && String(senderId) === String(currentUserId);

          // Build reply context if message is a reply
          let replyContext = '';
          if (msg.replyTo) {
            const replyText = msg.replyTo.content.length > 50 ? msg.replyTo.content.substring(0, 50) + '...' : msg.replyTo.content;
            const replySenderName = msg.replyTo.sender ? msg.replyTo.sender.name : 'Unknown';
            replyContext = `
              <div class="reply-context">
                <i class="ri-reply-line"></i>
                <span class="reply-sender">${replySenderName}</span>
                <span class="reply-text">${replyText}</span>
              </div>
            `;
          }

          messagesContainer.innerHTML += `
                <div class="msg-wrapper ${isMe ? 'sent' : 'received'}" data-msg-id="${msg.id}">
                    <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
                    ${!isMe ? `<img src="${msg.sender && msg.sender.avatar ? msg.sender.avatar : '/images/avatar-placeholder.png'}" class="msg-avatar">` : ''}
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
                            <button class="msg-action-btn" onclick="setReplyTo(${msg.id}, '${(msg.sender?.name || 'User').replace(/'/g, "\\'")}', '${msg.content.replace(/'/g, "\\'").substring(0, 100)}')" title="Reply">
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


    // Populate Details Pane (Hidden by default, waiting for toggle)
    if (detailsPane) {
      detailsPane.classList.remove('open'); // Close on new chat load
      updateDetailsPane(conversationName, conversationId, chatUser); // Populate content with real user data
    }

    // Show Chat Footer
    const chatFooter = document.getElementById('chat-footer');
    if (chatFooter) {
      chatFooter.style.display = 'flex';
    }

  } catch (error) {
    console.error('Error loading chat:', error);
  }
}

// Toggle Details Pane (Global for inline onclick)
window.toggleDetailsPane = function () {
  const pane = document.getElementById('chat-details-pane');
  if (pane) {
    const isOpen = pane.classList.contains('open');
    if (isOpen) {
      pane.classList.remove('open');
      pane.style.display = 'none';
    } else {
      pane.classList.add('open');
      pane.style.display = 'flex';
    }
  }
}

// Update Details Content
function updateDetailsPane(name, id, userDetails = {}) {
  const pane = document.getElementById('chat-details-pane');
  if (!pane) return;

  console.log('🔍 updateDetailsPane called with:', { name, id, userDetails });

  const bio = userDetails.bio || "N/A";
  const phone = userDetails.phone || "N/A";
  const email = userDetails.email || "N/A";
  const avatar = userDetails.avatar || "/images/avatar-placeholder.png";

  pane.innerHTML = `
        <div style="position: relative;">
            <i class="ri-close-line details-close-btn" onclick="toggleDetailsPane()"></i>
            
            <div class="profile-card">
                <img src="${avatar}" class="profile-lg" alt="${name}">
                <div class="profile-name">${name}</div>
                <div class="profile-status">Online</div>
            </div>

            <div class="detail-section">
                <div class="detail-title">About</div>
                <div class="info-item" style="margin-bottom: 15px;">
                    <i class="ri-user-line"></i>
                    <span style="font-weight: 600;">${name}</span>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
                    ${bio}
                </p>
                
                <div class="info-item">
                    <i class="ri-phone-line"></i>
                    <span>${phone}</span>
                </div>
                <div class="info-item">
                     <i class="ri-mail-line"></i>
                    <span style="font-size: 0.9rem;">${email}</span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-title">Settings</div>
                <div class="setting-item">
                    <span>Notification</span>
                    <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
                </div>
                <div class="setting-item">
                    <span>Starred Messages</span>
                    <i class="ri-arrow-right-s-line" style="color: var(--text-muted);"></i>
                </div>
            </div>
            
             <div class="detail-section">
                <div class="detail-title">Recent Media</div>
                 <div class="media-grid">
                     <div class="media-item"></div>
                     <div class="media-item"></div>
                     <div class="media-item"></div>
                 </div>
            </div>
        </div>
    `;
}

// Send message
// === CHAT HEADER ACTIONS ===

// Toggle Dropdown
window.toggleChatOptions = function (event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('chat-options-menu');
  menu.classList.toggle('show');

  // Close on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.classList.remove('show');
      document.removeEventListener('click', closeMenu);
    }
  };
  document.addEventListener('click', closeMenu);
}

// Toggle Search Bar
window.toggleSearch = function () {
  const searchBar = document.getElementById('chat-search-bar');
  searchBar.classList.toggle('active');
  if (searchBar.classList.contains('active')) {
    searchBar.querySelector('input').focus();
  } else {
    // Clear search
    searchBar.querySelector('input').value = '';
    searchInChat('');
  }
}

// Client-side Search
window.searchInChat = function (query) {
  const term = query.toLowerCase();
  const bubbles = document.querySelectorAll('.msg-bubble');
  bubbles.forEach(bubble => {
    const text = bubble.innerText.toLowerCase();
    const wrapper = bubble.closest('.msg-wrapper');
    if (text.includes(term)) {
      wrapper.style.display = 'flex';
    } else {
      wrapper.style.display = 'none';
    }
  });
}

// Toggle Selection Mode
window.toggleSelectionMode = function (enable = true) {
  const wrappers = document.querySelectorAll('.msg-wrapper');
  const header = document.getElementById('selection-header');

  if (enable) {
    document.body.classList.add('selection-active'); // Helper class
    wrappers.forEach(w => w.classList.add('selection-mode'));
    header.classList.add('active');
    // Reset checkboxes
    document.querySelectorAll('.msg-select-checkbox').forEach(cb => cb.checked = false);
    updateSelectionCount();
  } else {
    document.body.classList.remove('selection-active');
    wrappers.forEach(w => w.classList.remove('selection-mode'));
    header.classList.remove('active');
  }
}

window.updateSelectionCount = function () {
  const count = document.querySelectorAll('.msg-select-checkbox:checked').length;
  document.getElementById('selection-count').textContent = `${count} Selected`;
}

// === STAR AND REPLY FUNCTIONS ===

// Global variable to store reply-to message
let replyToMessage = null;

// Toggle star status of a message
window.toggleStar = async function (messageId, button) {
  try {
    const response = await fetch(`/api/messages/${messageId}/star`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      // Update button icon
      const icon = button.querySelector('i');
      if (data.isStarred) {
        icon.className = 'ri-star-fill';
        // Add star indicator to bubble if not already there
        const wrapper = button.closest('.msg-wrapper');
        const bubble = wrapper.querySelector('.msg-bubble');
        if (!bubble.querySelector('.starred-indicator')) {
          bubble.insertAdjacentHTML('afterbegin', '<i class="ri-star-fill starred-indicator"></i>');
        }
      } else {
        icon.className = 'ri-star-line';
        // Remove star indicator from bubble
        const wrapper = button.closest('.msg-wrapper');
        const bubble = wrapper.querySelector('.msg-bubble');
        const indicator = bubble.querySelector('.starred-indicator');
        if (indicator) indicator.remove();
      }

      if (window.notify) {
        window.notify.success(data.isStarred ? 'Message starred' : 'Star removed');
      }
    }
  } catch (error) {
    console.error('Error toggling star:', error);
    if (window.notify) window.notify.error('Failed to update star');
  }
};

// Set message to reply to
window.setReplyTo = function (messageId, senderName, messageContent) {
  replyToMessage = { id: messageId, sender: senderName, content: messageContent };

  // Show reply preview bar
  const chatFooter = document.getElementById('chat-footer');
  let replyBar = document.getElementById('reply-preview-bar');

  if (!replyBar) {
    replyBar = document.createElement('div');
    replyBar.id = 'reply-preview-bar';
    replyBar.className = 'reply-preview';
    chatFooter.insertAdjacentElement('beforebegin', replyBar);
  }

  const displayText = messageContent.length > 60 ? messageContent.substring(0, 60) + '...' : messageContent;

  replyBar.innerHTML = `
    <div class="reply-preview-content">
      <i class="ri-reply-line"></i>
      <div class="reply-preview-text">
        <div class="reply-preview-sender">${senderName}</div>
        <div class="reply-preview-message">${displayText}</div>
      </div>
      <button onclick="cancelReply()" class="reply-preview-close">
        <i class="ri-close-line"></i>
      </button>
    </div>
  `;

  replyBar.style.display = 'flex';

  // Focus on input
  const input = document.getElementById('messageInput');
  if (input) input.focus();
};

// Cancel reply
window.cancelReply = function () {
  replyToMessage = null;
  const replyBar = document.getElementById('reply-preview-bar');
  if (replyBar) replyBar.style.display = 'none';
};

// Toggle emoji picker for reactions
window.toggleEmojiPicker = function (messageId, button) {
  // Close any existing picker
  const existingPicker = document.querySelector('.emoji-picker');
  if (existingPicker) existingPicker.remove();

  // Create emoji picker
  const picker = document.createElement('div');
  picker.className = 'emoji-picker';

  const emojis = ['❤️', '👍', '😊', '😂', '😮', '😢', '🔥', '🎉'];

  picker.innerHTML = emojis.map(emoji =>
    `<button class="emoji-btn" onclick="addReaction(${messageId}, '${emoji}'); event.stopPropagation();">${emoji}</button>`
  ).join('');

  button.parentElement.appendChild(picker);

  // Close picker when clicking outside
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!picker.contains(e.target) && e.target !== button) {
        picker.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 10);
};

// Add emoji reaction to message
window.addReaction = function (messageId, emoji) {
  const wrapper = document.querySelector(`.msg-wrapper[data-msg-id="${messageId}"]`);
  if (!wrapper) return;

  const bubble = wrapper.querySelector('.msg-bubble');
  let reactions = bubble.querySelector('.msg-reactions');

  if (!reactions) {
    reactions = document.createElement('div');
    reactions.className = 'msg-reactions';
    bubble.appendChild(reactions);
  }

  // Check if emoji already exists
  const existingReaction = Array.from(reactions.children).find(r => r.textContent.startsWith(emoji));
  if (existingReaction) {
    // Increment count
    const countSpan = existingReaction.querySelector('.reaction-count');
    const currentCount = parseInt(countSpan.textContent) || 1;
    countSpan.textContent = currentCount + 1;
  } else {
    // Add new reaction
    const reaction = document.createElement('span');
    reaction.className = 'reaction-item';
    reaction.innerHTML = `${emoji} <span class="reaction-count">1</span>`;
    reactions.appendChild(reaction);
  }

  // Close emoji picker
  const picker = document.querySelector('.emoji-picker');
  if (picker) picker.remove();

  if (window.notify) window.notify.success('Reaction added');
};

// === DELETE CONFIRMATION & NOTIFICATIONS ===

let pendingDeleteAction = null;

// Show Confirmation Modal
window.showDeleteConfirmation = function (message, actionCallback) {
  // Create modal if not exists
  let modal = document.getElementById('custom-delete-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'custom-delete-modal';
    modal.className = 'custom-modal-overlay';
    modal.innerHTML = `
            <div class="custom-modal-content">
                <div class="modal-icon warning">
                    <i class="ri-delete-bin-line"></i>
                </div>
                <h3>Delete Messages?</h3>
                <p id="delete-modal-msg">Are you sure you want to delete these messages?</p>
                <div class="modal-actions">
                    <button class="btn-cancel" onclick="closeDeleteConfirmation()">Cancel</button>
                    <button class="btn-confirm-delete" onclick="confirmDeleteAction()">Delete</button>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
  }

  // Update content
  document.getElementById('delete-modal-msg').textContent = message;
  pendingDeleteAction = actionCallback;

  // Show
  modal.classList.add('active');
}

window.closeDeleteConfirmation = function () {
  const modal = document.getElementById('custom-delete-modal');
  if (modal) modal.classList.remove('active');
  pendingDeleteAction = null;
}

window.confirmDeleteAction = function () {
  if (pendingDeleteAction) pendingDeleteAction();
  closeDeleteConfirmation();
}


// Copy Selected Messages
window.copySelectedMessages = function () {
  const selected = document.querySelectorAll('.msg-select-checkbox:checked');
  if (selected.length === 0) return;

  // Get chat partner name from header
  const chatNameEl = document.querySelector('.chat-name');
  const partnerName = chatNameEl ? chatNameEl.textContent.trim() : 'Sender';

  const texts = [];
  selected.forEach(cb => {
    const wrapper = cb.closest('.msg-wrapper');
    const bubble = wrapper.querySelector('.msg-bubble');

    // Determine sender label
    const isSent = wrapper.classList.contains('sent');
    const label = isSent ? 'You' : partnerName;

    // Get text content excluding time
    const clone = bubble.cloneNode(true);
    const time = clone.querySelector('.msg-time');
    if (time) time.remove();

    const cleanText = clone.innerText.trim();
    texts.push(`${label}: ${cleanText}`);
  });

  const plainText = texts.join('\n\n'); // Double newline for readability
  navigator.clipboard.writeText(plainText).then(() => {
    // Use custom notification
    if (window.notify) {
      window.notify.success(`${selected.length} message(s) copied to clipboard!`);
    } else {
      // Fallback
      console.log(`${selected.length} message(s) copied!`);
    }
    toggleSelectionMode(false);
  }).catch(err => {
    console.error('Failed to copy: ', err);
    if (window.notify) window.notify.error('Failed to copy messages.');
  });
}

// Delete Selected Messages
window.deleteSelectedMessages = function () {
  const selected = document.querySelectorAll('.msg-select-checkbox:checked');
  if (selected.length === 0) return;

  showDeleteConfirmation(
    `Are you sure you want to delete ${selected.length} message(s)?`,
    () => {
      selected.forEach(cb => {
        cb.closest('.msg-wrapper').remove();
      });
      toggleSelectionMode(false);
      if (window.notify) window.notify.success('Messages deleted successfully');
    }
  );
}

// Delete Complete Chat
window.deleteCompleteChat = function () {
  showDeleteConfirmation(
    "Are you sure you want to delete this entire conversation? This cannot be undone.",
    () => {
      // Mock API call
      document.getElementById('messages-container').innerHTML = `
                <div class="empty-state" style="text-align: center; margin-top: 100px;">
                    <i class="ri-chat-delete-line" style="font-size: 3rem; color: #d1fae5;"></i>
                    <h3 style="color: var(--chat-text); margin-top: 20px;">Chat Deleted</h3>
                </div>
            `;
      if (window.notify) window.notify.success('Conversation deleted');
    }
  );
}

// Send message
window.sendMessage = async function (e, conversationId = window.currentConversationId) {
  if (e) e.preventDefault();

  if (!conversationId) {
    console.error("No conversation ID available");
    return;
  }

  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content) return;

  // Optimistic UI update
  const messagesContainer = document.getElementById('messages-container');
  // Remove empty state if present
  const emptyState = messagesContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  messagesContainer.innerHTML += `
    <div class="msg-wrapper sent">
        <input type="checkbox" class="msg-select-checkbox" onchange="updateSelectionCount()">
        <div class="msg-bubble">
            ${content}
            <span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    </div>
  `;

  // Clear input and scroll
  input.value = '';
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const requestBody = { conversationId, content };

    // Add replyToId if replying to a message
    if (replyToMessage) {
      requestBody.replyToId = replyToMessage.id;
    }

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    if (data.success) {
      // Clear reply preview if message was sent
      if (replyToMessage) {
        cancelReply();
      }
    } else {
      console.error("Message send failed:", data.message);
      // Ideally show error in UI
    }
  } catch (error) {
    console.error('Send message error:', error);
    window.notify.error('Failed to send message');
  }
}

// Handle Enter key in input
window.handleKeyPress = function (e) {
  if (e.key === 'Enter') {
    sendMessage(e);
  }
}

let allUsers = [];

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
      window.notify.error('Failed to load users');
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
            ${students.length > 0 ? `<optgroup label="Fellow Students">${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</optgroup>` : ''}
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
      window.notify.error('Failed to start conversation: ' + (data.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Start conversation error:', error);
    window.notify.error('Failed to start conversation');
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
      window.notify.error('Failed to load users');
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
              <input type="text" id="group-name" required placeholder="e.g., Study Group">
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
  const selected = Array.from(document.querySelectorAll('input[name="participants"]:checked')).map(cb => cb.value);
  if (selected.length === 0) {
    window.notify.warning('Please select at least one participant');
    return;
  }

  try {
    const response = await fetch('/api/messages/groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name, participants: selected })
    });

    const data = await response.json();
    if (data.success) {
      closeModal();
      loadConversations();
      // Open the new group chat
      loadChatHistory(data.conversation.id, data.conversation.name, true);
    } else {
      window.notify.error(data.message || 'Failed to create group');
    }
  } catch (error) {
    console.error('Create group error:', error);
    window.notify.error('An error occurred');
  }
}

// Close modal
function closeModal(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  document.getElementById('modal-container').innerHTML = '';
}

// Study Buddy Functions

// Open AI Chat Modal
window.openAIStudyBuddyChat = function () {
  const modal = `
    <div class="modal" onclick="closeModal(event)" style="display: flex;">
      <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
        <div class="modal-header">
          <h2><i class="ri-robot-line"></i> Study Buddy Chat</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <div class="chat-interface" style="height: 300px; display: flex; flex-direction: column;">
          <div id="ai-chat-messages" style="flex: 1; overflow-y: auto; padding: 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 10px;">
            <div class="message-bubble received">
              Hi! I'm your AI Study Buddy. How can I help you with your courses today?
            </div>
          </div>
          <div class="chat-input-area" style="display: flex; gap: 10px;">
            <input type="text" id="ai-chat-input" class="form-control" placeholder="Ask a question..." onkeypress="handleAIChatEnter(event)">
              <button class="btn btn-primary" onclick="sendAIMessage()">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modal;
}

// Handle Enter key in chat
window.handleAIChatEnter = function (event) {
  if (event.key === 'Enter') {
    sendAIMessage();
  }
}

// Send message to AI (Mock)
window.sendAIMessage = function () {
  const input = document.getElementById('ai-chat-input');
  const message = input.value.trim();
  if (!message) return;

  const chatMessages = document.getElementById('ai-chat-messages');

  // User message
  chatMessages.innerHTML += `
    <div class="message-bubble sent" style="align-self: flex-end; background: var(--primary-color); color: white; margin-left: auto;">
      ${message}
    </div>
  `;

  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // AI Response (Mock)
  setTimeout(() => {
    const responses = [
      "That's a great question! Based on your current progress in React Mastery, I'd suggest reviewing the 'Components' module.",
      "I can help with that. Have you checked the latest assignment guidelines?",
      "Keep up the good work! Consistent practice is key.",
      "Let me analyze your performance data... It looks like you're doing well in attendance but could improve on assignment submissions."
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    chatMessages.innerHTML += `
      <div class="message-bubble received">
        ${randomResponse}
      </div>
    `;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1000);
}

// Generate Study Plan
window.generateStudyPlan = function () {
  const container = document.getElementById('ai-insights-content');
  container.innerHTML = `
    <div class="ai-insight-item ai-loading">
      <i class="ri-loader-4-line ri-spin"></i>
      <span>Generating personalized study plan...</span>
    </div>
  `;

  setTimeout(() => {
    const insights = [
      {
        type: 'info',
        icon: 'ri-calendar-check-line',
        title: 'Study Plan for Today',
        desc: '1. Review "React Hooks" (30 mins)\n2. Complete "Component Lifecycle" quiz\n3. Start "Todo App" assignment',
        action: { text: 'Start Review', onclick: 'switchToSection("courses")' }
      }
    ];
    renderAIInsights(insights);
  }, 1500);
}

// Refresh Insights
window.refreshAIInsights = function () {
  const container = document.getElementById('ai-insights-content');
  container.innerHTML = `
    <div class="ai-insight-item ai-loading">
      <i class="ri-loader-4-line ri-spin"></i>
      <span>Analyzing latest data...</span>
    </div>
  `;

  // Re-run the main generation logic
  setTimeout(() => {
    const enrolledCourses = courses.filter(c => c.students?.some(s => s.id === targetUserId));
    generateAIInsights(enrolledCourses);
  }, 1000);
}

// Notifications
window.toggleNotifications = function () {
  // For now, just show a simple alert or modal
  window.notify.info("No new notifications at this time.");
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

// Profile Menu
window.toggleProfileMenu = function (event) {
  if (event) event.stopPropagation();
  const dropdown = document.querySelector('.user-profile-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
  }
}

// Global click handler for dropdowns
document.addEventListener('click', (e) => {
  // Close profile dropdown if clicked outside
  const dropdown = document.querySelector('.user-profile-dropdown');
  if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Attach theme toggle listener
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', window.toggleTheme);
  }

  // Attach profile menu listener
  const profileTrigger = document.querySelector('.profile-trigger');
  if (profileTrigger) {
    profileTrigger.addEventListener('click', window.toggleProfileMenu);
  }

  // Load User Info
  loadUserInfo();
});

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

      // Update Sidebar Info
      if (document.getElementById('sidebar-user-name')) {
        document.getElementById('sidebar-user-name').textContent = currentUser.name;
      }

      // Update Header Info
      if (document.getElementById('header-user-name')) {
        document.getElementById('header-user-name').textContent = currentUser.name;
      }
      if (document.getElementById('header-avatar')) {
        document.getElementById('header-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
      }

      // Update Dropdown Info
      if (document.getElementById('menu-user-name')) {
        document.getElementById('menu-user-name').textContent = currentUser.name;
      }
      if (document.getElementById('menu-user-role')) {
        const role = currentUser.role || 'Student';
        document.getElementById('menu-user-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
      }
      if (document.getElementById('menu-avatar')) {
        document.getElementById('menu-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
      }
    }
  } catch (error) {
    console.error('Error loading user info:', error);
    // If auth fails, we might want to logout or just log error
    if (error.message && error.message.includes('401')) {
      window.location.href = '/';
    }
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

              <div class="modal-actions" style="justify-content: space-between;">
                <button type="button" class="btn btn-secondary" onclick="openChangePasswordModal()">Change Password</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('profile-modal')">Close</button>
              </div>
            </form>
          </div>
        </div>
    </div>
      `;

  document.getElementById('modal-container').innerHTML = modalHtml;
}

// Open Change Password Modal
window.openChangePasswordModal = function () {
  const modalHtml = `
      <div class="modal" id="change-password-modal" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Change Password</h2>
            <button class="modal-close" onclick="closeModal('change-password-modal')">×</button>
          </div>
          <div class="modal-body">
            <form id="change-password-form" onsubmit="handlePasswordChange(event)">
              <div class="form-group">
                <label>Current Password</label>
                <input type="password" id="current-password" required>
              </div>
              <div class="form-group">
                <label>New Password</label>
                <input type="password" id="new-password" required minlength="6">
              </div>
              <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" id="confirm-password" required minlength="6">
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('change-password-modal')">Cancel</button>
                <button type="submit" class="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  document.getElementById('modal-container').innerHTML = modalHtml;
  // Close profile modal if open
  const profileModal = document.getElementById('profile-modal');
  if (profileModal) profileModal.remove();
}

window.handlePasswordChange = async function (e) {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    window.notify.error('New passwords do not match');
    return;
  }

  try {
    const response = await fetch('/api/auth/updatepassword', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json();
    if (data.success) {
      window.notify.success('Password updated successfully');
      closeModal('change-password-modal');
    } else {
      window.notify.error(data.message || 'Failed to update password');
    }
  } catch (error) {
    console.error('Password update error:', error);
    window.notify.error('An error occurred');
  }
}
