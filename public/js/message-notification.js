// Real-time Message Notification Handler

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id || typeof io === 'undefined') {
        console.warn('Cannot initialize socket: User not logged in or socket.io not loaded');
        return;
    }

    // Connect to Socket.IO with auth token
    const socket = io({
        auth: {
            token: token
        }
    });

    console.log('🔌 Connecting to socket for notifications...');

    // Join user room handled by backend on connection
    // (Backend checks session/user and joins automatically in our implementation)

    // Listen for new messages
    socket.on('new_message', (data) => {
        const { message, conversationId } = data;
        console.log('📨 Received new message:', message);

        // 1. Check if we are currently viewing this chat
        const isChatOpen = window.currentConversationId &&
            String(window.currentConversationId) === String(conversationId);

        if (isChatOpen) {
            // We are in the chat - append immediately? 
            // The optimistic UI might have handled it if WE sent it, but this is INCOMING.
            // So yes, append it if it's not already there.
            appendIncomingMessage(message);
        } else {
            // We are NOT in this chat (or on another page)
            // Show popup notification
            showNotificationPopup(message);
        }
    });

    /**
     * Appends an incoming message to the active chat window
     */
    function appendIncomingMessage(msg) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;

        // Check if message already exists (to avoid duplicates)
        const existingMsg = messagesContainer.querySelector(`[data-msg-id="${msg.id}"]`);
        if (existingMsg) return;

        const timeString = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Remove empty state if present
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const msgHtml = `
            <div class="msg-wrapper received" data-msg-id="${msg.id}">
                <div class="msg-bubble">
                    <div class="msg-sender-name">${msg.senderName}</div>
                    ${msg.content}
                    <span class="msg-time">${timeString}</span>
                    <div class="msg-actions">
                        <button class="msg-action-btn" title="Reply">
                            <i class="ri-reply-line"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Play subtle sound?
        // const audio = new Audio('/sounds/message.mp3');
        // audio.play().catch(e => console.log('Audio play failed:', e));
    }

    /**
     * Shows interactive popup notification
     */
    function showNotificationPopup(msg) {
        // Remove existing popup if any
        const existingPopup = document.querySelector('.message-popup');
        if (existingPopup) existingPopup.remove();

        // Create popup element
        const popup = document.createElement('div');
        popup.className = 'message-popup';

        popup.innerHTML = `
            <div class="popup-header" onclick="window.location.href='/admin/dashboard.html'">
                <div class="popup-sender">
                    <i class="ri-message-3-line" style="margin-right: 5px;"></i>
                    ${msg.senderName}
                </div>
                <button class="popup-close" onclick="event.stopPropagation(); this.closest('.message-popup').remove()">
                    <i class="ri-close-line"></i>
                </button>
            </div>
            <div class="popup-body" onclick="window.location.href='/admin/dashboard.html'">
                ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}
            </div>
            <div class="popup-footer">
                <input type="text" class="popup-input" placeholder="Type a reply..." id="popup-reply-input">
                <button class="popup-send" onclick="sendQuickReply('${msg.conversationId}', '${msg.id}')">
                    <i class="ri-send-plane-fill"></i>
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        // Focus input
        setTimeout(() => {
            const input = popup.querySelector('.popup-input');
            if (input) {
                input.focus();
                // Allow Enter key to send
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        sendQuickReply(msg.conversationId, msg.id);
                    }
                });
            }
        }, 100);

        // Auto remove after 10 seconds if no interaction
        // setTimeout(() => {
        //     if (document.body.contains(popup) && !popup.querySelector('input:focus')) {
        //         popup.remove();
        //     }
        // }, 10000);
    }

    /**
     * Sends quick reply from popup
     */
    window.sendQuickReply = async function (conversationId, replyToId) {
        const input = document.getElementById('popup-reply-input');
        if (!input) return;

        const content = input.value.trim();
        if (!content) return;

        // Disable input
        input.disabled = true;

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId,
                    content,
                    replyToId
                })
            });

            const data = await response.json();

            if (data.success) {
                // Determine user role to direct correctly
                const userRole = user.role || 'student';
                let dashboardUrl = '/student/dashboard.html';
                if (userRole === 'admin') dashboardUrl = '/admin/dashboard.html';
                else if (userRole === 'professor') dashboardUrl = '/professor/dashboard.html';

                // Change button to checkmark
                const btn = document.querySelector('.popup-send');
                btn.innerHTML = '<i class="ri-check-line"></i>';
                btn.style.backgroundColor = '#10b981';

                // Show "Reply Sent" and link to chat
                const footer = document.querySelector('.popup-footer');
                footer.innerHTML = `
                    <div style="color: #10b981; font-size: 13px; flex: 1; display: flex; align-items: center;">
                        <i class="ri-check-double-line" style="margin-right: 5px;"></i> Reply Sent!
                    </div>
                    <button class="popup-view-btn" onclick="window.location.href='${dashboardUrl}'" style="width: auto;">View Chat</button>
                `;

                // Remove after delay
                setTimeout(() => {
                    const popup = document.querySelector('.message-popup');
                    if (popup) popup.remove();
                }, 3000);
            }
        } catch (error) {
            console.error('Quick reply error:', error);
            input.disabled = false;
            window.notify ? window.notify.error('Failed to send') : alert('Failed to send reply');
        }
    }
});
