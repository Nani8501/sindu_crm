// AI Chat Logic

class AIChat {
    constructor() {
        this.isOpen = false;
        this.mode = 'popup'; // popup, side, full
        this.isExternal = false; // false = Internal, true = External
        this.aiUserId = 'ai-assistant';
        this.conversationId = null;
        this.messages = [];
        this.pollInterval = null;
        this.isSelectMode = false;

        this.init();
    }

    init() {
        this.renderUI();
        this.attachListeners();
        // Don't load chat immediately, wait for open
    }

    renderUI() {
        // FAB button is now replaced by the draggable AI Study Buddy button
        // We'll hide this FAB to avoid duplication
        const fab = document.createElement('div');
        fab.className = 'ai-fab';
        fab.innerHTML = '<i class="ri-robot-2-fill"></i>';
        fab.style.zIndex = '2147483647';
        fab.style.display = 'none'; // Hide the static FAB
        document.body.appendChild(fab);

        // Use capture phase to ensure we catch the click
        window.addEventListener('click', (e) => {
            if (e.target.closest('.ai-fab')) {
                console.log('Captured FAB click');
                e.stopPropagation();
                e.preventDefault();
                this.toggleChat();
            }
        }, true);

        // Create Chat Container
        const container = document.createElement('div');
        container.className = `ai-chat-container mode-${this.mode}`;
        container.id = 'ai-chat-container';
        container.innerHTML = `
            <div class="ai-header">
                <div class="ai-title">
                    <i class="ri-sparkling-2-fill"></i>
                    Study Buddy
                </div>
                <div class="ai-controls">
                    <button class="ai-control-btn" onclick="aiChat.toggleSelectMode()" title="Print/Save PDF"><i class="ri-printer-line"></i></button>
                    <button class="ai-control-btn" onclick="aiChat.setMode('popup')" title="Popup View"><i class="ri-contract-left-right-line"></i></button>
                    <button class="ai-control-btn" onclick="aiChat.setMode('side')" title="Side Panel"><i class="ri-layout-right-line"></i></button>
                    <button class="ai-control-btn" onclick="aiChat.setMode('full')" title="Full Screen"><i class="ri-fullscreen-line"></i></button>
                    <button class="ai-control-btn" onclick="aiChat.toggleChat()" title="Close"><i class="ri-close-line"></i></button>
                </div>
            </div>
            
            <!-- Floating Toggle -->
            <div class="ai-toggle-container" title="Toggle Data Source">
                <span class="ai-toggle-label" id="ai-toggle-text">Internal Data</span>
                <div class="ai-toggle" id="ai-data-toggle" onclick="aiChat.toggleDataSource()">
                    <div class="ai-toggle-handle"></div>
                </div>
            </div>

            <div class="ai-print-bar" id="ai-print-bar">
                <span>Select messages to print</span>
                <button class="ai-print-btn" onclick="aiChat.printSelected()">Print Selected</button>
            </div>

            <div class="ai-messages" id="ai-messages-area">
                <div class="text-center text-muted mt-2" style="font-size: 0.8rem; background: rgba(255,255,0,0.1); padding: 5px; border-radius: 5px;">
                    ⚠️ Messages are cleared every 7 days.
                </div>
                <div class="text-center text-muted mt-4">
                    <i class="ri-robot-2-fill" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p>Hello! I'm Study Buddy.<br>Ask me anything about your CRM.</p>
                </div>
            </div>
            <div class="ai-input-area">
                <input type="text" class="ai-input" id="ai-input" placeholder="Type a message..." onkeypress="aiChat.handleKeyPress(event)">
                <button class="ai-send-btn" onclick="aiChat.sendMessage()">
                    <i class="ri-send-plane-fill"></i>
                </button>
            </div>
        `;
        document.body.appendChild(container);
    }

    attachListeners() {
        // Global access
        window.aiChat = this;
    }

    toggleChat() {
        console.log('Toggling chat', this.isOpen);
        this.isOpen = !this.isOpen;
        const container = document.getElementById('ai-chat-container');

        if (this.isOpen) {
            container.classList.add('open');
            this.loadChat();
            this.startPolling();
            setTimeout(() => document.getElementById('ai-input').focus(), 300);
        } else {
            container.classList.remove('open');
            this.stopPolling();
        }
    }

    setMode(mode) {
        this.mode = mode;
        const container = document.getElementById('ai-chat-container');
        container.className = `ai-chat-container open mode-${mode}`;
    }

    toggleDataSource() {
        this.isExternal = !this.isExternal;
        const toggle = document.getElementById('ai-data-toggle');
        const label = document.getElementById('ai-toggle-text');

        if (this.isExternal) {
            toggle.classList.add('active');
            label.textContent = 'External AI';
        } else {
            toggle.classList.remove('active');
            label.textContent = 'Internal Data';
        }
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            this.sendMessage();
        }
    }

    async loadChat() {
        try {
            // Get conversation with AI
            // We use the 'user ID' endpoint which finds/creates direct conversation
            const response = await fetch(`/api/messages/conversation/${this.aiUserId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();

            if (data.success) {
                this.conversationId = data.conversationId;
                this.messages = data.messages;
                this.renderMessages();
            }
        } catch (error) {
            console.error('Error loading AI chat:', error);
        }
    }

    renderMessages() {
        const area = document.getElementById('ai-messages-area');
        if (this.messages.length === 0) {
            area.innerHTML = `
                <div class="text-center text-muted mt-4">
                    <i class="ri-robot-2-fill" style="font-size: 3rem; opacity: 0.5;"></i>
                    <p>Hello! I'm Study Buddy.<br>Ask me anything about your CRM.</p>
                </div>
            `;
            return;
        }

        area.innerHTML = this.messages.map((msg, index) => {
            const isMe = msg.senderId !== this.aiUserId;
            // Parse Markdown for AI messages, plain text for user (to avoid XSS from user input if not sanitized)
            // Check if marked is available
            let contentHtml = msg.content;
            if (isMe) {
                contentHtml = msg.content;
            } else {
                try {
                    if (typeof marked !== 'undefined') {
                        contentHtml = marked.parse(msg.content);
                    } else {
                        console.warn('marked library not loaded, showing raw text');
                        contentHtml = msg.content;
                    }
                } catch (e) {
                    console.error('Error parsing markdown:', e);
                    contentHtml = msg.content;
                }
            }

            return `
                <div class="ai-message-row">
                    <input type="checkbox" class="ai-checkbox" value="${index}">
                    <div class="ai-message ${isMe ? 'user' : 'ai'}">
                        <div class="message-content">${contentHtml}</div>
                        ${!isMe ? `
                            <div class="ai-message-actions">
                                <button class="ai-action-btn" onclick="aiChat.copyMessage(${index})" title="Copy">
                                    <i class="ri-file-copy-line"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        area.scrollTop = area.scrollHeight;
    }

    toggleSelectMode() {
        this.isSelectMode = !this.isSelectMode;
        const container = document.getElementById('ai-chat-container');
        if (this.isSelectMode) {
            container.classList.add('mode-select');
        } else {
            container.classList.remove('mode-select');
            // Uncheck all
            document.querySelectorAll('.ai-checkbox').forEach(cb => cb.checked = false);
        }
    }

    copyMessage(index) {
        const msg = this.messages[index];
        if (msg) {
            navigator.clipboard.writeText(msg.content).then(() => {
                // Visual feedback could be added here
                if (window.notify) {
                    window.notify.success('Copied to clipboard!');
                } else {
                    console.log('Copied to clipboard!');
                }
            });
        }
    }

    printSelected() {
        const checkboxes = document.querySelectorAll('.ai-checkbox:checked');
        if (checkboxes.length === 0) {
            if (window.notify) {
                window.notify.warning('Please select at least one message to print.');
            } else {
                console.warn('Please select at least one message to print.');
            }
            return;
        }

        const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.value));
        const selectedMessages = selectedIndices.map(i => this.messages[i]);

        // Create printable content
        const printContent = selectedMessages.map(msg => {
            const isMe = msg.senderId !== this.aiUserId;
            const role = isMe ? 'You' : 'Study Buddy';
            let content = msg.content;
            try {
                if (typeof marked !== 'undefined') {
                    content = marked.parse(msg.content);
                }
            } catch (e) {
                console.error('Error parsing markdown for print:', e);
            }
            return `
                <div class="print-message">
                    <strong>${role}:</strong>
                    <div>${content}</div>
                </div>
                <hr>
            `;
        }).join('');

        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Chat - Sindhu Software Training</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    .print-message { margin-bottom: 20px; }
                    hr { border: 0; border-top: 1px solid #ccc; margin: 20px 0; }
                    img { max-width: 100%; }
                </style>
            </head>
            <body>
                <h1>Chat Transcript</h1>
                ${printContent}
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    async sendMessage() {
        const input = document.getElementById('ai-input');
        const content = input.value.trim();

        if (!content) return;

        // Optimistic UI update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            content: content,
            senderId: 'me', // placeholder
            createdAt: new Date()
        };
        this.messages.push(tempMsg);
        this.renderMessages();
        input.value = '';

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    receiver: this.aiUserId,
                    content: content,
                    isExternal: this.isExternal
                })
            });

            const data = await response.json();
            if (data.success) {
                // Replace temp message with real one (or just reload)
                // For simplicity, we'll reload shortly via polling or immediate fetch
                this.loadChat();
            }
        } catch (error) {
            console.error('Send message error:', error);
            if (window.notify) {
                window.notify.error('Failed to send message');
            }
        }
    }

    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => {
            if (this.isOpen) this.loadChat();
        }, 3000);
    }

    stopPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Only init if logged in (check for token)
    if (localStorage.getItem('token')) {
        new AIChat();
    }
});
