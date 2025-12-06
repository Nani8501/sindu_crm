
// Mobile chat navigation function
window.showConversationList = function () {
    if (window.innerWidth <= 768) {
        const conversationList = document.querySelector('.conversation-list');
        const chatWindow = document.getElementById('chat-window');

        if (conversationList) {
            conversationList.style.display = 'flex';
        }
        if (chatWindow) {
            chatWindow.style.display = 'none';
            chatWindow.innerHTML = '';
        }
    }
};

// Update mobile back button visibility
const updateMobileBackButton = () => {
    const backButtons = document.querySelectorAll('.mobile-back-to-list');
    backButtons.forEach(backButton => {
        if (backButton) {
            backButton.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
        }
    });
};

// Initial check and setup
document.addEventListener('DOMContentLoaded', () => {
    updateMobileBackButton();

    // Update on resize
    window.addEventListener('resize', updateMobileBackButton);

    // Observe for dynamically added chat windows
    const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Check if the node or its children contain the back button
                    if (node.classList?.contains('mobile-back-to-list') ||
                        node.querySelector?.('.mobile-back-to-list') ||
                        node.classList?.contains('chat-header')) {
                        shouldUpdate = true;
                    }
                }
            });
        });
        if (shouldUpdate) {
            setTimeout(updateMobileBackButton, 50); // Small delay to ensure DOM is ready
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
