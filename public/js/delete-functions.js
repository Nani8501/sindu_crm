// Universal delete item function that routes to specific delete functions
window.executeDelete = async function (type, id, name) {
    switch (type) {
        case 'user':
            return await deleteUser(id, name);
        case 'course':
            return await deleteCourse(id, name);
        case 'assignment':
            return await deleteAssignment(id, name);
        case 'session':
            return await deleteSession(id, name);
        default:
            notify.error(`Unknown item type: ${type}`);
    }
}

// Delete user function
window.deleteUser = async function (userId, userName) {
    // Confirmation handled by modal now
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            notify.success(`User "${userName}" deleted successfully!`);
            // Reload users list
            await loadUsers();
        } else {
            notify.error(`Failed to delete user: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        notify.error(`Error deleting user: ${error.message}`);
    }
}

// Delete course function
window.deleteCourse = async function (courseId, courseTitle) {
    try {
        const response = await fetch(`/api/courses/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            notify.success(`Course "${courseTitle}" deleted successfully!`);
            // Reload courses list
            await loadCourses();
        } else {
            notify.error(`Failed to delete course: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        notify.error(`Error deleting course: ${error.message}`);
    }
}

// Delete assignment function
window.deleteAssignment = async function (assignmentId, assignmentTitle) {
    try {
        const response = await fetch(`/api/assignments/${assignmentId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            notify.success(`Assignment "${assignmentTitle}" deleted successfully!`);
            // Reload assignments list
            await loadAssignments();
        } else {
            notify.error(`Failed to delete assignment: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting assignment:', error);
        notify.error(`Error deleting assignment: ${error.message}`);
    }
}

// Delete session function
window.deleteSession = async function (sessionId, sessionTitle) {
    if (!confirm(`Are you sure you want to delete session: ${sessionTitle}?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            notify.success(`Session "${sessionTitle}" deleted successfully!`);
            // Reload sessions list
            await loadSessions();
        } else {
            notify.error(`Failed to delete session: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        notify.error(`Error deleting session: ${error.message}`);
    }
}
