// Change Password Modal
function openChangePasswordModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'change-password-modal';
    modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; margin: 100px auto;">
      <div class="modal-header">
        <h2>Change Password</h2>
        <span class="modal-close" onclick="closeChangePasswordModal()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="change-password-form" onsubmit="handleChangePassword(event)">
          <div class="form-group">
            <label for="current-password">Current Password</label>
            <input type="password" id="current-password" required>
          </div>
          <div class="form-group">
            <label for="new-password">New Password</label>
            <input type="password" id="new-password" required minlength="8">
            <small>Must be at least 8 characters with uppercase, lowercase, number, and special character</small>
          </div>
          <div class="form-group">
            <label for="confirm-password">Confirm New Password</label>
            <input type="password" id="confirm-password" required>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeChangePasswordModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Change Password</button>
          </div>
        </form>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function closeChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    if (modal) {
        modal.remove();
    }
}

async function handleChangePassword(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        alert('New passwords do not match!');
        return;
    }

    // Password complexity check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        alert('Password must contain at least 8 characters including uppercase, lowercase, number, and special character');
        return;
    }

    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Password changed successfully!');
            closeChangePasswordModal();
        } else {
            alert(data.message || 'Error changing password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Server error changing password');
    }
}
