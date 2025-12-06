// Animated Notification System
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('notification-container');
        }
    }

    show(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        // Color schemes for different types
        const colors = {
            success: { bg: '#10b981', icon: '✓', border: '#059669' },
            error: { bg: '#ef4444', icon: '✕', border: '#dc2626' },
            warning: { bg: '#f59e0b', icon: '⚠', border: '#d97706' },
            info: { bg: '#3b82f6', icon: 'ℹ', border: '#2563eb' },
            caution: { bg: '#f97316', icon: '⚡', border: '#ea580c' }
        };

        const config = colors[type] || colors.info;

        notification.style.cssText = `
      background: ${config.bg};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      border-left: 4px solid ${config.border};
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 400px;
      pointer-events: all;
      font-size: 0.95rem;
      animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      position: relative;
      overflow: hidden;
    `;

        notification.innerHTML = `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        font-weight: bold;
        flex-shrink: 0;
      ">${config.icon}</div>
      <div style="flex: 1; word-wrap: break-word;">${message}</div>
      <button onclick="this.parentElement.remove()" style="
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.8;
        transition: opacity 0.2s;
        flex-shrink: 0;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.5);
        animation: progress ${duration}ms linear;
      "></div>
    `;

        this.container.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease-in-out';
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }

    success(message, duration) {
        this.show(message, 'success', duration);
    }

    error(message, duration) {
        this.show(message, 'error', duration);
    }

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }

    caution(message, duration) {
        this.show(message, 'caution', duration);
    }
}

// Add animations to document
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    @keyframes progress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `;
    document.head.appendChild(style);
}

// Create global instance
window.notify = new NotificationSystem();

// Replace all alert() calls with notifications
const originalAlert = window.alert;
window.alert = function (message) {
    // Determine type based on message content
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('success') || lowerMessage.includes('successfully') || lowerMessage.includes('deleted')) {
        window.notify.success(message);
    } else if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('invalid')) {
        window.notify.error(message);
    } else if (lowerMessage.includes('warning') || lowerMessage.includes('sure')) {
        window.notify.warning(message);
    } else {
        window.notify.info(message);
    }
};
