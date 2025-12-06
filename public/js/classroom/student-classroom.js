// ===========================
// STUDENT CLASSROOM FUNCTIONS
// ===========================

let studentClassrooms = [];

// Load student classrooms
async function loadStudentClassrooms() {
  try {
    const response = await fetch('/api/classroom/list/active', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (data.success) {
      studentClassrooms = data.classrooms || [];
      renderStudentClassrooms();
    } else {
      console.error('Failed to load classrooms:', data.message);
    }
  } catch (error) {
    console.error('Error loading classrooms:', error);
  }
}

// Render student classrooms
function renderStudentClassrooms() {
  const now = new Date();

  const live = studentClassrooms.filter(c => c.status === 'live');
  const upcoming = studentClassrooms.filter(c => c.status === 'scheduled');
  const recent = studentClassrooms.filter(c => c.status === 'ended').slice(0, 5);

  // Live classrooms
  const liveEl = document.getElementById('live-classrooms-list');
  if (live.length) {
    liveEl.innerHTML = live.map(classroom => `
      <div class="classroom-item mb-2" style="padding: var(--spacing-md); border-left: 4px solid #10b981; background: var(--bg-card); border-radius: 8px;">
        <div class="item-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div class="item-title" style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
              ${classroom.title}
              <span class="badge" style="background: #10b981; color: white; font-size: 0.75rem; padding: 4px 10px; border-radius: 4px;">🔴 LIVE</span>
            </div>
            <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 6px;">${classroom.description || ''}</div>
          </div>
        </div>
        <div class="item-footer" style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 12px; color: var(--text-secondary);">
          <span><i class="ri-user-line"></i> ${classroom.teacher?.name || 'Teacher'}</span>
          <span><i class="ri-group-line"></i> ${classroom.participantCount || 0} students</span>
          <span><i class="ri-time-line"></i> Started: ${new Date(classroom.actualStart).toLocaleTimeString()}</span>
        </div>
        <button class="btn btn-success" onclick="joinStudentClassroom('${classroom.id}')">
          <i class="ri-video-line"></i> Join Now
        </button>
      </div>
    `).join('');
  } else {
    liveEl.innerHTML = '<p class="text-muted" style="padding: var(--spacing-md); text-align: center;">No live classrooms at the moment</p>';
  }

  // Upcoming classrooms
  const upcomingEl = document.getElementById('upcoming-classrooms-list');
  if (upcoming.length) {
    upcomingEl.innerHTML = upcoming.map(classroom => `
      <div class="classroom-item mb-2" style="padding: var(--spacing-md); background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
        <div class="item-header" style="margin-bottom: 10px;">
          <div class="item-title" style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${classroom.title}</div>
          <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 6px;">${classroom.description || ''}</div>
        </div>
        <div class="item-footer" style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px; color: var(--text-secondary);">
          <span><i class="ri-user-line"></i> ${classroom.teacher?.name || 'Teacher'}</span>
          <span><i class="ri-calendar-line"></i> ${new Date(classroom.scheduledStart).toLocaleString()}</span>
          <span><i class="ri-time-line"></i> ${calculateDuration(classroom.scheduledStart, classroom.scheduledEnd)}</span>
        </div>
        <div style="color: var(--text-muted); font-size: 0.875rem;">
          <i class="ri-information-line"></i> Classroom will be available when the teacher starts it
        </div>
      </div>
    `).join('');
  } else {
    upcomingEl.innerHTML = '<p class="text-muted" style="padding: var(--spacing-md); text-align: center;">No upcoming classrooms scheduled</p>';
  }

  // Recent classrooms
  const recentEl = document.getElementById('recent-classrooms-list');
  if (recent.length) {
    recentEl.innerHTML = recent.map(classroom => `
      <div class="classroom-item mb-2" style="padding: var(--spacing-md); background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color); opacity: 0.7;">
        <div class="item-header" style="margin-bottom: 8px;">
          <div class="item-title" style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${classroom.title}</div>
        </div>
        <div class="item-footer" style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 0.875rem; color: var(--text-muted);">
          <span><i class="ri-calendar-line"></i> ${new Date(classroom.actualEnd || classroom.scheduledEnd).toLocaleDateString()}</span>
          <span><i class="ri-time-line"></i> ${calculateDuration(classroom.actualStart, classroom.actualEnd)}</span>
        </div>
      </div>
    `).join('');
  } else {
    recentEl.innerHTML = '<p class="text-muted" style="padding: var(--spacing-md); text-align: center;">No classroom history yet</p>';
  }
}

// Join student classroom
window.joinStudentClassroom = function (classroomId) {
  window.open(`/classroom/student.html?id=${classroomId}`, '_blank');
};

// Calculate duration
function calculateDuration(start, end) {
  if (!start || !end) return 'Duration N/A';

  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} min`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  }
}
