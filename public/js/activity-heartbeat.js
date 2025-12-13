// User Activity Heartbeat - Tracks user activity and updates server
(function () {
    'use strict';

    let isUserActive = false;
    let heatbeatInterval = null;

    // Track user activity
    function trackActivity() {
        isUserActive = true;
    }

    // Update activity on server
    async function updateActivity() {
        // Only send heartbeat if user was active in the last interval
        if (!isUserActive) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // User not logged in, stop heartbeat
                stopHeartbeat();
                return;
            }

            const response = await fetch('/api/users/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('[Heartbeat] Activity updated');
            } else {
                console.warn('[Heartbeat] Failed to update activity:', response.status);
            }
        } catch (error) {
            console.error('[Heartbeat] Error updating activity:', error);
        }

        // Reset activity flag after sending
        isUserActive = false;
    }

    // Start heartbeat
    function startHeartbeat() {
        if (heatbeatInterval) {
            return; // Already running
        }

        console.log('[Heartbeat] Starting activity tracking (30s interval)');

        // Send initial heartbeat immediately
        isUserActive = true;
        updateActivity();

        // Then send every 30 seconds
        heatbeatInterval = setInterval(updateActivity, 30000); // 30 seconds
    }

    // Stop heartbeat
    function stopHeartbeat() {
        if (heatbeatInterval) {
            clearInterval(heatbeatInterval);
            heatbeatInterval = null;
            console.log('[Heartbeat] Stopped activity tracking');
        }
    }

    // Setup activity listeners
    function setupActivityListeners() {
        // Track various user interactions
        document.addEventListener('click', trackActivity, true);
        document.addEventListener('keypress', trackActivity, true);
        document.addEventListener('mousemove', trackActivity, true);
        document.addEventListener('scroll', trackActivity, true);

        // Track touch events for mobile
        document.addEventListener('touchstart', trackActivity, true);
        document.addEventListener('touchmove', trackActivity, true);
    }

    // Initialize on page load
    function init() {
        // Only start if user is logged in
        const token = localStorage.getItem('token');
        if (token) {
            setupActivityListeners();
            startHeartbeat();
        }

        // Stop heartbeat when user logs out
        window.addEventListener('beforeunload', stopHeartbeat);
    }

    // Expose global functions if needed
    window.activityHeartbeat = {
        start: startHeartbeat,
        stop: stopHeartbeat
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
