// ===========================
// CLASSROOM MANAGEMENT FUNCTIONS
// ===========================

let classrooms = [];

// Load classrooms
async function loadClassrooms() {
  try {
    const response = await fetch('/api/classroom/user/my-classrooms', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    if (data.success) {
      classrooms = data.classrooms || [];
      renderClassrooms();
    } else {
      console.error('Failed to load classrooms:', data.message);
    }
  } catch (error) {
    console.error('Error loading classrooms:', error);
  }
}

// Render classrooms
function renderClassrooms() {
  const now = new Date();

  const active = classrooms.filter(c => c.status === 'live');
  const upcoming = classrooms.filter(c => c.status === 'scheduled');
  const past = classrooms.filter(c => c.status === 'ended');

  // Active classrooms
  const activeEl = document.getElementById('active-classrooms-list');
  if (active.length) {
    activeEl.innerHTML = active.map(classroom => `
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
          <span><i class="ri-group-line"></i> ${classroom.participantCount || 0} students</span>
          <span><i class="ri-time-line"></i> Started: ${new Date(classroom.actualStart).toLocaleTimeString()}</span>
        </div>
        <div class="mt-2" style="display: flex; gap: 10px;">
          <button class="btn btn-success btn-sm" onclick="joinClassroom('${classroom.id}')">
            <i class="ri-video-line"></i> Join Classroom
          </button>
          <button class="btn btn-danger btn-sm" onclick="endClassroom('${classroom.id}')">
            <i class="ri-stop-circle-line"></i> End Class
          </button>
        </div>
      </div>
    `).join('');
  } else {
    activeEl.innerHTML = '<p class="text-muted" style="padding: var(--spacing-md); text-align: center;">No active classrooms</p>';
  }

  // Upcoming classrooms
  const upcomingEl = document.getElementById('upcoming-classrooms-list');
  if (upcoming.length) {
    upcomingEl.innerHTML = upcoming.map(classroom => `
      <div class="classroom-item mb-2" style="padding: var(--spacing-md); background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);">
        <div class="item-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div class="item-title" style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">${classroom.title}</div>
            <div style="font-size: 0.875rem; color: var(--text-muted); margin-top: 6px;">${classroom.description || ''}</div>
          </div>
          <span class="badge badge-primary">Scheduled</span>
        </div>
        <div class="item-footer" style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 12px; color: var(--text-secondary);">
          <span><i class="ri-calendar-line"></i> ${new Date(classroom.scheduledStart).toLocaleString()}</span>
          <span><i class="ri-user-line"></i> Max: ${classroom.maxStudents} students</span>
        </div>
        <div class="mt-2" style="display: flex; gap: 10px;">
          <button class="btn btn-primary btn-sm" onclick="joinClassroom('${classroom.id}')">
            <i class="ri-play-circle-line"></i> Start Classroom
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editClassroom('${classroom.id}')">
            <i class="ri-edit-line"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteClassroom('${classroom.id}')">
            <i class="ri-delete-bin-line"></i> Delete
          </button>
        </div>
      </div>
    `).join('');
  } else {
    upcomingEl.innerHTML = '<p class="text-muted" style="padding: var(--spacing-md); text-align: center;">No upcoming classrooms</p>';
  }

  // Past classrooms
  const pastEl = document.getElementById('past-classrooms-list');
  if (past.length) {
    pastEl.innerHTML = past.slice(0, 5).map(classroom => `
      <div class="classroom-item mb-2" style="padding: var(--spacing-md); background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color); opacity: 0.7;">
        <div class="item-header" style="margin-bottom: 8px;">
          <div class="item-title" style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${classroom.title}</div>
        </div>
        <div class="item-footer" style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 0.875rem; color: var(--text-muted);">
          <span><i class="ri-calendar-line"></i> ${new Date(classroom.actualEnd || classroom.scheduledEnd).toLocaleDateString()}</span>
          <span><i class="ri-group-line"></i> ${classroom.participantCount || 0} participants</span>
          <span><i class="ri-time-line"></i> Duration: ${classroom.duration || 'N/A'}</span>
        </div>
      </div>
    `).join('');
  } else {
    pastEl.innerHTML = '<p class="text-muted" style="padding: var(--spacing-md); text-align: center;">No past classrooms</p>';
  }
}

// Show create classroom modal
window.showCreateClassroom = async function () {
  // Fetch courses for the dropdown
  let coursesOptions = '';
  try {
    const response = await fetch('/api/courses', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    if (data.courses && data.courses.length) {
      coursesOptions = data.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
  }

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Create Online Classroom</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="createClassroom(event)">
          <div class="form-group">
            <label>Classroom Title</label>
            <input type="text" id="classroom-title" placeholder="e.g., Week 5: Advanced SQL" required>
          </div>
          <div class="form-group">
            <label>Description (optional)</label>
            <textarea id="classroom-description" rows="3" placeholder="Brief description of this classroom session"></textarea>
          </div>
          <div class="form-group">
            <label>Course (optional)</label>
            <select id="classroom-course">
              <option value="">Select a course</option>
              ${coursesOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Scheduled Start</label>
            <input type="datetime-local" id="classroom-start" required>
          </div>
          <div class="form-group">
            <label>Scheduled End</label>
            <input type="datetime-local" id="classroom-end" required>
          </div>
          <div class="form-group">
            <label>Max Students</label>
            <input type="number" id="classroom-max" value="60" min="1" max="100" required>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Classroom</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;

  // Set default times (1 hour from now, 2 hours duration)
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  document.getElementById('classroom-start').value = start.toISOString().slice(0, 16);
  document.getElementById('classroom-end').value = end.toISOString().slice(0, 16);
};

// Create classroom
window.createClassroom = async function (e) {
  e.preventDefault();

  const classroomData = {
    title: document.getElementById('classroom-title').value,
    description: document.getElementById('classroom-description').value,
    courseId: document.getElementById('classroom-course').value || undefined,
    scheduledStart: document.getElementById('classroom-start').value,
    scheduledEnd: document.getElementById('classroom-end').value,
    maxStudents: parseInt(document.getElementById('classroom-max').value)
  };

  try {
    const response = await fetch('/api/classroom/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(classroomData)
    });

    const data = await response.json();

    if (data.success) {
      alert('Classroom created successfully!');
      closeModal();
      await loadClassrooms();
    } else {
      alert('Error: ' + (data.message || 'Failed to create classroom'));
    }
  } catch (error) {
    console.error('Error creating classroom:', error);
    alert('Error creating classroom: ' + error.message);
  }
};

// Join classroom
window.joinClassroom = function (classroomId) {
  window.open(`/classroom/teacher.html?id=${classroomId}`, '_blank');
};

// End classroom
window.endClassroom = async function (classroomId) {
  if (!confirm('Are you sure you want to end this classroom session?')) return;

  try {
    const response = await fetch(`/api/classroom/${classroomId}/end`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('Classroom ended successfully');
      await loadClassrooms();
    } else {
      alert('Error: ' + (data.message || 'Failed to end classroom'));
    }
  } catch (error) {
    console.error('Error ending classroom:', error);
    alert('Error ending classroom: ' + error.message);
  }
};

// Delete classroom
window.deleteClassroom = async function (classroomId) {
  if (!confirm('Are you sure you want to delete this classroom? This action cannot be undone.')) return;

  try {
    const response = await fetch(`/api/classroom/${classroomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('Classroom deleted successfully');
      await loadClassrooms();
    } else {
      alert('Error: ' + (data.message || 'Failed to delete classroom'));
    }
  } catch (error) {
    console.error('Error deleting classroom:', error);
    alert('Error deleting classroom: ' + error.message);
  }
};

// Edit classroom (placeholder for now)
window.editClassroom = function (classroomId) {
  alert('Edit classroom feature coming soon! ID: ' + classroomId);
};
