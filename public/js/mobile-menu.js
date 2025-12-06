// Mobile sidebar toggle
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');

    // Toggle body class for backdrop
    document.body.classList.toggle('sidebar-open');
}

// Mobile profile menu toggle
function toggleMobileProfileMenu() {
    const profileMenu = document.getElementById('mobile-profile-menu');
    profileMenu.classList.toggle('active');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const mobileHeader = document.querySelector('.mobile-header');
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && mobileHeader && !mobileHeader.contains(e.target)) {
            sidebar.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    }
});

// Auto-close sidebar when clicking nav items on mobile
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    document.body.classList.remove('sidebar-open');
                }
            }
        });
    });
});

// Sync theme toggle between desktop and mobile
document.addEventListener('DOMContentLoaded', () => {
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
    const desktopThemeToggle = document.getElementById('theme-toggle');

    if (mobileThemeToggle && desktopThemeToggle) {
        // Sync mobile theme toggle with desktop
        mobileThemeToggle.addEventListener('click', (e) => {
            desktopThemeToggle.click();
        });

        // Update mobile theme icon when theme changes
        const observer = new MutationObserver(() => {
            const desktopIcon = desktopThemeToggle.querySelector('.theme-icon');
            const mobileIcon = mobileThemeToggle.querySelector('.theme-icon');
            if (desktopIcon && mobileIcon) {
                mobileIcon.className = desktopIcon.className;
            }
        });

        observer.observe(desktopThemeToggle, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }
});
