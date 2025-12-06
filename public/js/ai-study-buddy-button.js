// AI Study Buddy Floating Button with Drag Functionality
class AIStudyBuddyButton {
    constructor() {
        this.isDragging = false;
        this.currentX = 0;
        this.currentY = 0;
        this.initialX = 0;
        this.initialY = 0;
        this.xOffset = 0;
        this.yOffset = 0;
        this.init();
    }

    init() {
        // Only show for authenticated users
        const token = localStorage.getItem('token');
        if (!token) return;

        this.createFloatingButton();
        this.loadSavedPosition();
    }

    createFloatingButton() {
        // Remove existing button if any
        const existing = document.getElementById('ai-study-buddy-btn');
        if (existing) existing.remove();

        // Create floating button
        const button = document.createElement('button');
        button.id = 'ai-study-buddy-btn';
        button.className = 'ai-floating-btn';
        button.innerHTML = `
            <i class="ri-robot-line"></i>
            <span class="ai-tooltip">AI Study Buddy<br><small style="opacity: 0.7;">Drag to move</small></span>
        `;

        // Click to open chat
        button.addEventListener('click', () => {
            if (!this.isDragging) {
                this.openAIChat();
            }
        });

        // Make it draggable
        this.setupDragListeners(button);

        document.body.appendChild(button);
        this.button = button;
        this.addStyles();

        // Animate on first appearance
        setTimeout(() => button.classList.add('show'), 200);
    }

    setupDragListeners(element) {
        // Mouse events
        element.addEventListener('mousedown', this.dragStart.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.dragEnd.bind(this));

        // Touch events for mobile
        element.addEventListener('touchstart', this.dragStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.drag.bind(this), { passive: false });
        document.addEventListener('touchend', this.dragEnd.bind(this));
    }

    dragStart(e) {
        const event = e.type === 'touchstart' ? e.touches[0] : e;

        this.initialX = event.clientX - this.xOffset;
        this.initialY = event.clientY - this.yOffset;

        if (e.target === this.button || e.target.parentNode === this.button) {
            this.isDragging = true;
            this.button.style.cursor = 'grabbing';
            this.button.classList.remove('show');
            this.button.style.animation = 'none';
        }
    }

    drag(e) {
        if (this.isDragging) {
            e.preventDefault();

            const event = e.type === 'touchmove' ? e.touches[0] : e;

            this.currentX = event.clientX - this.initialX;
            this.currentY = event.clientY - this.initialY;

            this.xOffset = this.currentX;
            this.yOffset = this.currentY;

            this.setTranslate(this.currentX, this.currentY, this.button);
        }
    }

    dragEnd(e) {
        if (this.isDragging) {
            this.initialX = this.currentX;
            this.initialY = this.currentY;
            this.isDragging = false;
            this.button.style.cursor = 'grab';

            // Save position
            this.savePosition();

            // Re-enable animations after a brief delay
            setTimeout(() => {
                this.button.classList.add('show');
            }, 100);
        }
    }

    setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    savePosition() {
        const position = {
            x: this.xOffset,
            y: this.yOffset
        };
        localStorage.setItem('ai_buddy_position', JSON.stringify(position));
    }

    loadSavedPosition() {
        const saved = localStorage.getItem('ai_buddy_position');
        if (saved) {
            try {
                const position = JSON.parse(saved);
                this.xOffset = position.x;
                this.yOffset = position.y;
                if (this.button) {
                    this.setTranslate(position.x, position.y, this.button);
                }
            } catch (e) {
                console.error('Error loading AI buddy position:', e);
            }
        }
    }

    addStyles() {
        if (document.getElementById('ai-study-buddy-styles')) return;

        const style = document.createElement('style');
        style.id = 'ai-study-buddy-styles';
        style.textContent = `
            .ai-floating-btn {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: grab;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                z-index: 99997;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: box-shadow 0.3s ease;
                transform: scale(0);
                opacity: 0;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
            }

            .ai-floating-btn.show {
                transform: scale(1);
                opacity: 1;
                animation: aiGlow 2s ease-in-out infinite;
            }

            .ai-floating-btn:hover {
                box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
            }

            .ai-floating-btn:active {
               cursor: grabbing;
            }

            .ai-tooltip {
                position: absolute;
                left: 100%;
                margin-left: 12px;
                background: var(--bg-card);
                color: var(--text-primary);
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.85rem;
                text-align: center;
                line-height: 1.4;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                border: 1px solid var(--border-color);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s, transform 0.2s;
                transform: translateX(-10px);
                white-space: nowrap;
            }

            .ai-tooltip::before {
                content: '';
                position: absolute;
                left: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-right: 6px solid var(--bg-card);
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
            }

            .ai-floating-btn:hover .ai-tooltip {
                opacity: 1;
                transform: translateX(0);
            }

            @keyframes aiGlow {
                0%, 100% {
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                }
                50% {
                    box-shadow: 0 4px 30px rgba(118, 75, 162, 0.7);
                }
            }

            .ai-floating-btn::after {
                content: '✨';
                position: absolute;
                top: -5px;
                right: -5px;
                font-size: 1rem;
                animation: sparkle 3s ease-in-out infinite;
                pointer-events: none;
            }

            @keyframes sparkle {
                0%, 100% {
                    opacity: 0;
                    transform: scale(0.5) rotate(0deg);
                }
                50% {
                    opacity: 1;
                    transform: scale(1) rotate(180deg);
                }
            }

            @media (max-width: 768px) {
                .ai-floating-btn {
                    width: 48px;
                    height: 48px;
                    font-size: 1.3rem;
                }

                .ai-tooltip {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    openAIChat() {
        // Detect screen size
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobile: Redirect to messages/chat section
            const chatSection = document.querySelector('[data-section="messages"]') ||
                document.querySelector('[data-section="chat"]');
            const chatNavItem = document.querySelector('.nav-item[data-section="messages"]') ||
                document.querySelector('.nav-item[data-section="chat"]');

            if (chatSection && chatNavItem) {
                chatNavItem.click();
                window.notify?.success('Opened Messages!');
            } else {
                // Fallback: redirect to dashboard
                const currentPath = window.location.pathname;
                let targetUrl = '/student/dashboard.html';

                if (currentPath.includes('/professor/')) {
                    targetUrl = '/professor/dashboard.html';
                } else if (currentPath.includes('/admin/')) {
                    targetUrl = '/admin/dashboard.html';
                }

                window.location.href = targetUrl;
            }
        } else {
            // Desktop/Laptop: Open AI Chat Modal
            if (window.aiChat) {
                if (!window.aiChat.isOpen) {
                    window.aiChat.toggleChat();
                    window.notify?.success('Opened AI Study Buddy!');
                }
            } else {
                // Fallback if AI chat not loaded
                window.notify?.error('AI Study Buddy is not available. Please refresh the page.');
            }
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.aiStudyBuddy = new AIStudyBuddyButton();
});
