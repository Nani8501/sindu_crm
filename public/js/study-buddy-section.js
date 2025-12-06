// Study Buddy Section - Uses modern-chat.css only  
class StudyBuddySection {
    constructor() {
        this.aiUserId = 'ai-assistant';
        this.currentConversationId = null;
        this.conversations = [];
        this.messages = [];
        this.pollInterval = null;
        this.isExternal = false;
    }

    async init() {
        console.log('StudyBuddySection: init() called');
        const container = document.getElementById('study-buddy-container');
        if (!container) {
            console.error('StudyBuddySection: Container not found!');
            return;
        }

        this.renderUI();
        await this.loadConversations();

        // Don't auto-select any conversation - let user start fresh or click existing
        this.currentConversationId = null;
        this.messages = [];
        this.renderMessages();

        this.attachListeners();
    }

    renderUI() {
        const container = document.getElementById('study-buddy-container');

        const htmlContent = `
          <div class="chat-container-modern">
              <!-- Sidebar -->
              <div class="chat-sidebar">
                  <div class="chat-sidebar-header">
                      <div class="search-box">
                          <i class="ri-search-line" style="color: var(--chat-text-muted);"></i>
                          <input type="text" placeholder="Search conversations..." id="study-buddy-search" oninput="studyBuddySection.filterConversations(this.value)">
                      </div>
                  </div>

                  <div class="chat-list" id="history-list">
                      <div style="padding: 10px; text-align: center; color: var(--chat-text-muted);">Loading history...</div>
                  </div>
                  
                  <!-- Fixed Sidebar Footer -->
                  <div class="chat-sidebar-footer" style="padding: 16px; border-top: 1px solid var(--chat-border);">
                      <button class="btn-new-chat" onclick="studyBuddySection.startNewChat()">
                          <i class="ri-add-line"></i> New Chat
                      </button>
                      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                          <span style="font-size: 0.8rem; color: var(--chat-text-muted);">AI Mode</span>
                          <div class="toggle-switch-small" id="ai-mode-switch" style="display: flex; background: #f3f4f6; border-radius: 6px; padding: 2px;">
                              <div class="toggle-option-small ${!this.isExternal ? 'active' : ''}" 
                                   onclick="studyBuddySection.toggleMode(false)" 
                                   style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer; border-radius: 4px; color: #6b7280; ${!this.isExternal ? 'background: #006064; color: white;' : ''}">
                                  CRM
                              </div>
                              <div class="toggle-option-small ${this.isExternal ? 'active' : ''}" 
                                   onclick="studyBuddySection.toggleMode(true)"
                                   style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer; border-radius: 4px; color: #6b7280; ${this.isExternal ? 'background: #006064; color: white;' : ''}">
                                  Web
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <!-- Main Chat -->
              <div class="chat-main" id="study-buddy-window">
                  <div class="chat-header" id="chat-header-buddy" style="visibility: visible; position: relative;">
                      
                      <!-- Normal Header Content -->
                      <div class="header-content" style="display: flex; flex: 1; align-items: center;">
                          <div class="header-user" style="flex: 1; overflow: hidden; display: flex; align-items: center; gap: 10px;">
                              <button class="mobile-back-btn" onclick="event.stopPropagation(); studyBuddySection.toggleSidebar()">
                                <i class="ri-arrow-left-line"></i>
                              </button>
                              <div class="avatar-wrapper">
                                   <i class="ri-robot-2-line" style="font-size: 24px; color: #fff; background: #006064; border-radius: 50%; padding: 8px;"></i>
                                   <div class="status-dot status-online"></div>
                              </div>
                              <div style="min-width: 0;">
                                  <h3 class="chat-name" id="buddy-chat-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Study Buddy - CRM</h3>
                                  <div class="chat-time" style="text-align: left; color: #10b981;">Online</div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div class="chat-messages" id="study-buddy-messages">
                      <div class="empty-state" style="text-align: center; margin-top: 100px;">
                          <i class="ri-robot-2-line" style="font-size: 4rem; color: #d1fae5;"></i>
                          <h3 style="color: var(--chat-text); margin-top: 20px;">AI Study Buddy</h3>
                          <p style="color: var(--chat-text-muted);">Start chatting to get help</p>
                      </div>
                  </div>

                  <!-- Chat Footer (Input) -->
                  <div class="chat-footer" id="chat-footer-buddy" style="display: flex;">
                      <button class="btn-icon" onclick="document.getElementById('file-input-buddy').click()">
                          <i class="ri-attachment-2"></i>
                      </button>
                      <input type="file" id="file-input-buddy" style="display: none;">
                      
                      <div class="input-wrapper">
                          <input type="text" placeholder="Type a message..." id="study-buddy-input" onkeypress="if(event.key==='Enter') studyBuddySection.sendMessage()">
                          <button class="btn-emoji">
                              <i class="ri-emotion-line"></i>
                          </button>
                      </div>
                      
                      <button class="btn-send" onclick="studyBuddySection.sendMessage()">
                          <i class="ri-send-plane-fill"></i>
                      </button>
                  </div>
              </div>
          </div>
        `;

        container.innerHTML = htmlContent;
    }

    async loadConversations() {
        try {
            const listContainer = document.getElementById('history-list');
            if (listContainer) listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--chat-text-muted);">Loading history...</div>';

            const response = await fetch('/api/messages/ai/conversations', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data.success) {
                // Keep all conversations - backend returns them in proper order
                this.conversations = data.conversations || [];
                this.renderHistoryList();
            } else {
                console.error('loadConversations failed:', data.message);
                if (listContainer) listContainer.innerHTML = '<div style="padding: 10px; color: #ef4444;">Failed to load</div>';
            }
        } catch (error) {
            console.error('loadConversations error:', error);
            const listContainer = document.getElementById('history-list');
            if (listContainer) listContainer.innerHTML = '<div style="padding: 10px; color: #ef4444;">Error loading history</div>';
        }
    }

    renderHistoryList() {
        const listContainer = document.getElementById('history-list');
        if (!listContainer) return;

        console.log('DEBUG renderHistoryList: conversations length =', this.conversations.length);
        console.log('DEBUG renderHistoryList: conversations =', this.conversations);

        if (this.conversations.length === 0) {
            listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--chat-text-muted);">No conversations yet</div>';
            return;
        }

        listContainer.innerHTML = this.conversations.map(conv => {
            // Get the conversation name (the backend auto-generates it from first message)
            const conversationName = conv.name || 'Study Buddy';
            const lastMessage = conv.lastMessage ? (conv.lastMessage.length > 30 ? conv.lastMessage.substring(0, 30) + '...' : conv.lastMessage) : 'Click to chat';
            const time = conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const isActive = conv.id === this.currentConversationId ? 'active' : '';
            const avatar = '/images/avatar-placeholder.png';

            return `
                <div class="chat-item ${isActive}" onclick="studyBuddySection.selectConversation(${conv.id})" data-conversation-id="${conv.id}">
                    <div class="avatar-wrapper">
                        <img src="${avatar}" alt="Study Buddy" class="avatar-img">
                    </div>
                    <div class="chat-info">
                        <div class="chat-name-row">
                            <span class="chat-name">${conversationName}</span>
                            <span class="chat-time">${time}</span>
                        </div>
                        <div class="chat-name-row">
                            <span class="chat-preview">${lastMessage}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async selectConversation(conversationId) {
        this.currentConversationId = conversationId;
        // Re-render to update active state
        this.renderHistoryList();

        try {
            const response = await fetch(`/api/messages/conversation/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            if (data.success) {
                this.messages = data.messages || [];
                this.renderMessages();
            }
        } catch (error) {
            console.error('selectConversation error:', error);
            window.notify?.error('Failed to load conversation');
        }
    }

    filterConversations(searchTerm) {
        const items = document.querySelectorAll('.chat-item');
        const term = searchTerm.toLowerCase().trim();

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'flex' : 'none';
        });
    }

    renderMessages() {
        const container = document.getElementById('study-buddy-messages');
        if (!container) return;

        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; margin-top: 100px;">
                    <i class="ri-robot-2-line" style="font-size: 4rem; color: #d1fae5;"></i>
                    <h3 style="color: var(--chat-text); margin-top: 20px;">${this.isExternal ? '🌐 External AI' : '💾 Internal CRM AI'}</h3>
                    <p style="color: var(--chat-text-muted);">Start chatting in this mode</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.messages.map(msg => {
            const isUser = msg.senderId !== this.aiUserId;
            let content = this.escapeHtml(msg.content);

            if (!isUser) {
                content = content
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>')
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
            }

            return `
                <div class="msg-group ${isUser ? 'msg-sent' : 'msg-received'}">
                    ${!isUser ? `
                    <div class="msg-avatar">
                        <i class="ri-robot-2-line" style="font-size: 20px; color: #006064;"></i>
                    </div>
                    ` : ''}
                    <div class="msg-bubble">
                        <div class="msg-content">${content}</div>
                        <div class="msg-time">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => container.scrollTop = container.scrollHeight, 100);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    toggleMode(isExternal) {
        this.isExternal = isExternal;

        // Update toggle visual
        const toggleSwitch = document.getElementById('ai-mode-switch');
        if (toggleSwitch) {
            toggleSwitch.innerHTML = `
                <div class="toggle-option-small ${!this.isExternal ? 'active' : ''}" 
                     onclick="studyBuddySection.toggleMode(false)"
                     style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer; border-radius: 4px; color: #6b7280; ${!this.isExternal ? 'background: #006064; color: white;' : ''}">
                    CRM
                </div>
                <div class="toggle-option-small ${this.isExternal ? 'active' : ''}" 
                     onclick="studyBuddySection.toggleMode(true)"
                     style="padding: 4px 10px; font-size: 0.75rem; cursor: pointer; border-radius: 4px; color: #6b7280; ${this.isExternal ? 'background: #006064; color: white;' : ''}">
                    Web
                </div>
            `;
        }

        // Update header
        const headerName = document.getElementById('buddy-chat-name');
        if (headerName) {
            const mode = this.isExternal ? 'Web' : 'CRM';
            const userName = localStorage.getItem('user_name') || 'Study Buddy';
            headerName.textContent = `${userName} - ${mode}`;
        }

        window.notify?.info(`Mode: ${this.isExternal ? 'External Web' : 'Internal CRM'}`);
    }

    toggleSidebar(forceState) {
        const sidebar = document.querySelector('.chat-sidebar');
        if (typeof forceState === 'boolean') {
            sidebar.classList.toggle('open', forceState);
        } else {
            sidebar.classList.toggle('open');
        }
    }

    async startNewChat() {
        this.currentConversationId = null;
        this.messages = [];
        this.renderMessages();
        this.renderHistoryList();

        const input = document.getElementById('study-buddy-input');
        if (input) input.focus();
    }

    async sendMessage() {
        const input = document.getElementById('study-buddy-input');
        const fileInput = document.getElementById('file-input-buddy');
        if (!input) return;

        const content = input.value.trim();
        const hasFile = fileInput && fileInput.files && fileInput.files[0];

        // Require either text or file
        if (!content && !hasFile) return;

        input.value = '';

        try {
            let conversationId = this.currentConversationId;

            if (!conversationId) {
                const startResponse = await fetch('/api/messages/ai/start', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ mode: this.isExternal ? 'external' : 'internal' })
                });

                if (!startResponse.ok) throw new Error('Failed to start conversation');

                const startData = await startResponse.json();
                if (!startData.success) throw new Error(startData.message);

                conversationId = startData.conversationId;
                this.currentConversationId = conversationId;
            }

            // Use FormData for file upload support
            const formData = new FormData();
            formData.append('receiver', this.aiUserId);
            formData.append('content', content || (hasFile ? 'Sent an attachment' : ''));
            formData.append('conversationId', conversationId);
            formData.append('isExternal', this.isExternal);

            if (hasFile) {
                formData.append('attachment', fileInput.files[0]);
            }

            // Send message
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                    // Note: Don't set Content-Type - browser sets it automatically with boundary for FormData
                },
                body: formData
            });

            if (!response.ok) throw new Error('Failed to send message');

            const data = await response.json();
            if (data.success) {
                // Clear file input after successful send
                if (fileInput) fileInput.value = '';

                await this.selectConversation(conversationId);
                await this.loadConversations();
            }
        } catch (error) {
            console.error('sendMessage error:', error);
            window.notify?.error('Failed to send message');
        }
    }

    attachListeners() {
        const input = document.getElementById('study-buddy-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }
}

// NOTE: Instance is created in student-dashboard.js as window.studyBuddySection
// Do not create a global instance here
