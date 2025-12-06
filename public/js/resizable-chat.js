// Make conversation list resizable
(function () {
    let isResizing = false;
    let lastX = 0;

    function initResizableConversationList() {
        const chatContainer = document.querySelector('.chat-container');
        if (!chatContainer) return;

        const conversationList = chatContainer.querySelector('.conversation-list');
        if (!conversationList) return;

        // Add resize handle
        console.log('Initializing resize handle for conversation list');
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: ew-resize;
      background: rgba(255, 255, 255, 0.1);
      z-index: 100;
      transition: background 0.2s;
    `;

        resizeHandle.addEventListener('mouseenter', () => {
            resizeHandle.style.background = 'rgba(99, 102, 241, 0.5)';
        });

        resizeHandle.addEventListener('mouseleave', () => {
            if (!isResizing) {
                resizeHandle.style.background = 'transparent';
            }
        });

        conversationList.style.position = 'relative';
        conversationList.appendChild(resizeHandle);

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            lastX = e.clientX;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            resizeHandle.style.background = 'rgba(99, 102, 241, 0.8)';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const dx = e.clientX - lastX;
            lastX = e.clientX;

            const currentWidth = conversationList.offsetWidth;
            const newWidth = Math.max(250, Math.min(600, currentWidth + dx)); // Min 250px, Max 600px

            conversationList.style.width = newWidth + 'px';
            conversationList.style.minWidth = newWidth + 'px';
            conversationList.style.maxWidth = newWidth + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                resizeHandle.style.background = 'transparent';

                // Save width to localStorage
                const width = conversationList.offsetWidth;
                localStorage.setItem('conversationListWidth', width);
            }
        });

        // Restore saved width with validation
        const savedWidth = localStorage.getItem('conversationListWidth');
        if (savedWidth && savedWidth > 0) {
            const width = Math.max(250, Math.min(600, parseInt(savedWidth))); // Ensure within bounds
            conversationList.style.width = width + 'px';
            conversationList.style.minWidth = width + 'px';
            conversationList.style.maxWidth = width + 'px';
        } else {
            // Set default width if no valid saved width
            conversationList.style.width = '300px';
            conversationList.style.minWidth = '300px';
            conversationList.style.maxWidth = '300px';
        }
    }

    // Initialize when messages section is loaded
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                const chatContainer = document.querySelector('.chat-container');
                if (chatContainer && !chatContainer.querySelector('.resize-handle')) {
                    initResizableConversationList();
                }
            }
        });
    });

    // Start observing
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Try to initialize immediately if already loaded
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initResizableConversationList, 1000);
    });

    // Also try when clicking messages tab
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item[data-section="messages"]');
        if (navItem) {
            setTimeout(initResizableConversationList, 500);
        }
    });
})();
