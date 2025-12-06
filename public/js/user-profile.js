// User Profile Page Logic
let currentUser = null;
let profileUser = null;
let courses = [];

// Initialize profile page
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkAuth();
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Unauthorized access');
        window.close();
        return;
    }

    // Get user ID and role from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    const userRole = urlParams.get('role');

    if (!userId || !userRole) {
        alert('Missing user information');
        window.close();
        return;
    }

    await loadUserProfile(userId, userRole);
});

// Load user profile
async function loadUserProfile(userId, role) {
    try {
        // Load courses to find user information
        const coursesRes = await api.getCourses();
        courses = coursesRes.courses || [];

        // Find user in courses
        let user = null;
        const userCourses = [];

        courses.forEach(course => {
            if (role === 'professor' && course.professor?.id == userId) {
                user = course.professor;
                userCourses.push(course);
            } else if (role === 'student' && course.students) {
                const student = course.students.find(s => s.id == userId);
                if (student) {
                    user = student;
                    userCourses.push(course);
                }
            }
        });

        if (!user) {
            alert('User not found');
            window.close();
            return;
        }

        profileUser = user;

        // Display user information
        displayUserInfo(user, role, userCourses);
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading user profile');
    }
}

// Display user information
function displayUserInfo(user, role, userCourses) {
    // Set avatar emoji
    const avatarEmoji = role === 'professor' ? '👨‍🏫' : '👨‍🎓';
    document.getElementById('user-avatar').textContent = avatarEmoji;

    // Set name
    document.getElementById('user-name').textContent = user.name;

    // Set role badge
    const roleBadge = `<span class="badge ${role === 'professor' ? 'badge-primary' : 'badge-success'}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
    document.getElementById('user-role-badge').innerHTML = roleBadge;

    // Set contact info
    document.getElementById('user-email').textContent = user.email || 'Not provided';
    document.getElementById('user-phone').textContent = user.phone || 'Not provided';
    document.getElementById('user-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('user-id').textContent = user.id;

    // Display courses
    document.getElementById('course-count').textContent = `(${userCourses.length})`;

    const coursesListEl = document.getElementById('courses-list');
    if (userCourses.length) {
        coursesListEl.innerHTML = userCourses.map(course => `
      <div class="course-card mb-3">
        <h3 class="course-title">${course.name}</h3>
        <p class="item-description">${course.description || 'No description'}</p>
        <div class="course-meta">
          <div class="meta-item">👥 ${course.students?.length || 0} students</div>
          <div class="meta-item">⏱️ ${course.duration}</div>
          <div class="meta-item">📅 Starts: ${new Date(course.startDate).toLocaleDateString()}</div>
        </div>
      </div>
    `).join('');
    } else {
        coursesListEl.innerHTML = '<p class="text-muted">No courses enrolled</p>';
    }
}
