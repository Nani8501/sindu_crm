// Group Chat Helper Functions

// Edit group name
window.editGroupName = async function (conversationId) {
    const currentName = document.getElementById('group-name-display').textContent;
    const newName = prompt('Enter new group name:', currentName);

    if (!newName || newName === currentName) return;

    try {
        const response = await fetch(`/api/messages/groups/${conversationId}/name`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('group-name-display').textContent = newName;
            document.querySelector('#chat-header h3').textContent = newName;
            loadConversations(); // Refresh conversation list
            alert('Group name updated successfully!');
        } else {
            alert(data.message || 'Failed to update group name');
        }
    } catch (error) {
        console.error('Error updating group name:', error);
        alert('Failed to update group name');
    }
}

// Change group icon
window.changeGroupIcon = function (conversationId) {
    // This would typically open a file picker
    alert('Group icon change functionality - To be implemented with file upload');
    // TODO: Implement file upload for group icon
}

// Manage group settings
window.manageGroupSettings = function (conversationId) {
    const modal = `
    <div class="modal" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="ri-settings-3-line"></i> Group Settings</h2>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="setting-row" style="padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">Send Messages</div>
              <div style="font-size: 0.85rem; color: #6b7280;">Allow all members to send messages</div>
            </div>
            <div class="toggle-switch active"></div>
          </div>
          
          <div class="setting-row" style="padding: 16px 0; border-bottom: 1px solid #f3f4f6;">
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">Edit Group Info</div>
              <div style="font-size: 0.85rem; color: #6b7280;">Allow members to edit group settings</div>
            </div>
            <div class="toggle-switch"></div>
          </div>
          
          <button onclick="leaveGroup(${conversationId})" 
            style="width: 100%; padding: 12px; margin-top: 20px; background: #ef4444; color: white; 
            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            <i class="ri-logout-box-line"></i> Leave Group
          </button>
        </div>
      </div>
    </div>
  `;

    document.getElementById('modal-container').innerHTML = modal;
}

// Leave group
window.leaveGroup = async function (conversationId) {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
        const response = await fetch(`/api/messages/groups/${conversationId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        if (data.success) {
            closeModal();
            loadConversations();
            document.getElementById('chat-window').innerHTML = '<div class="empty-state"><h3>Select a conversation</h3></div>';
            alert('You have left the group');
        } else {
            alert(data.message || 'Failed to leave group');
        }
    } catch (error) {
        console.error('Error leaving group:', error);
        alert('Failed to leave group');
    }
}
