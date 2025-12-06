// Edit Course Function
window.editCourse = function (courseId) {
  const course = courses.find(c => c.id == courseId);
  if (!course) {
    alert('Course not found');
    return;
  }

  const professors = allUsers.filter(u => u.role === 'professor');

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Edit Course</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="updateCourse(event, '${course.id}')">
          <div class="form-group">
            <label>Course Name</label>
            <input type="text" id="edit-course-name" value="${course.name}" required>
          </div>
          <div class="form-group">
            <label>Professor</label>
            <select id="edit-course-professor">
              ${professors.map(p => `<option value="${p.id}" ${p.id == course.professorId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="edit-course-description" rows="3" required>${course.description}</textarea>
          </div>
          <div class="form-group">
            <label>Duration</label>
            <input type="text" id="edit-course-duration" value="${course.duration}" required>
          </div>
          <div class="form-group">
            <label>Syllabus</label>
            <textarea id="edit-course-syllabus" rows="4">${course.syllabus || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="edit-course-status" required>
              <option value="true" ${course.isActive !== false ? 'selected' : ''}>Active</option>
              <option value="false" ${course.isActive === false ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Course</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
};

// Update Course Function
window.updateCourse = async function (event, courseId) {
  event.preventDefault();

  const courseData = {
    name: document.getElementById('edit-course-name').value,
    professorId: document.getElementById('edit-course-professor').value,
    description: document.getElementById('edit-course-description').value,
    duration: document.getElementById('edit-course-duration').value,
    syllabus: document.getElementById('edit-course-syllabus').value,
    isActive: document.getElementById('edit-course-status').value === 'true'
  };

  try {
    const response = await fetch(`/api/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(courseData)
    });

    const data = await response.json();

    if (data.success) {
      alert('Course updated successfully!');
      closeModal();
      await loadAllData();
      renderCourses();
    } else {
      alert(data.message || 'Error updating course');
    }
  } catch (error) {
    console.error('Error updating course:', error);
    alert('Server error updating course');
  }
};

// Edit Assignment Function
window.editAssignment = function (assignmentId) {
  const assignment = assignments.find(a => a.id == assignmentId);
  if (!assignment) {
    alert('Assignment not found');
    return;
  }

  const modal = `
    <div class="modal" onclick="closeModal(event)">
      <div class="modal-content" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h2>Edit Assignment</h2>
          <button class="modal-close" onclick="closeModal(event)">×</button>
        </div>
        <form onsubmit="updateAssignment(event, '${assignment.id}')">
          <div class="form-group">
            <label>Title</label>
            <input type="text" id="edit-assignment-title" value="${assignment.title}" required>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea id="edit-assignment-description" rows="3" required>${assignment.description}</textarea>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input type="datetime-local" id="edit-assignment-due-date" value="${new Date(assignment.dueDate).toISOString().slice(0, 16)}" required>
          </div>
          <div class="form-group">
            <input type="number" id="edit-assignment-max-score" value="${assignment.maxScore || 100}" required>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="edit-assignment-status" required>
              <option value="true" ${assignment.isActive !== false ? 'selected' : ''}>Active</option>
              <option value="false" ${assignment.isActive === false ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal(event)">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Assignment</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('modal-container').innerHTML = modal;
};

// Update Assignment Function
window.updateAssignment = async function (event, assignmentId) {
  event.preventDefault();

  const assignmentData = {
    title: document.getElementById('edit-assignment-title').value,
    description: document.getElementById('edit-assignment-description').value,
    dueDate: document.getElementById('edit-assignment-due-date').value,
    maxScore: document.getElementById('edit-assignment-max-score').value,
    isActive: document.getElementById('edit-assignment-status').value === 'true'
  };

  try {
    const response = await fetch(`/api/assignments/${assignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(assignmentData)
    });

    const data = await response.json();

    if (data.success) {
      alert('Assignment updated successfully!');
      closeModal();
      await loadAllData();
      renderAssignments();
    } else {
      alert(data.message || 'Error updating assignment');
    }
  } catch (error) {
    console.error('Error updating assignment:', error);
    alert('Server error updating assignment');
  }
};
