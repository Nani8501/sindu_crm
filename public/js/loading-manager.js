// Loading Utilities
class LoadingManager {
    constructor() {
        this.overlayId = 'global-loading-overlay';
    }

    // Show global loading overlay
    show(text = 'Loading...', subtext = '') {
        // Remove existing overlay if any
        this.hide();

        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
                ${subtext ? `<div class="loading-subtext">${subtext}</div>` : ''}
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // Hide global loading overlay
    hide() {
        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => overlay.remove(), 200);
        }
    }

    // Show loading on specific element
    showOnElement(element, size = 'medium') {
        if (typeof element === 'string') {
            element = document.getElementById(element) || document.querySelector(element);
        }
        if (!element) return;

        element.classList.add('content-loading');
        const spinnerSize = size === 'small' ? '30px' : size === 'large' ? '50px' : '40px';
        element.innerHTML = `<div class="loading-spinner" style="width: ${spinnerSize}; height: ${spinnerSize};"></div>`;
    }

    // Add loading state to button
    buttonLoading(button, loading = true) {
        if (typeof button === 'string') {
            button = document.getElementById(button) || document.querySelector(button);
        }
        if (!button) return;

        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
            button.dataset.originalText = button.textContent;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        }
    }

    // Create skeleton loader
    createSkeleton(type = 'card', count = 3) {
        const skeletons = [];

        for (let i = 0; i < count; i++) {
            if (type === 'card') {
                skeletons.push(`
                    <div class="skeleton-card">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text"></div>
                    </div>
                `);
            } else if (type === 'list') {
                skeletons.push(`<div class="skeleton skeleton-list-item"></div>`);
            } else if (type === 'text') {
                skeletons.push(`<div class="skeleton skeleton-text"></div>`);
            }
        }

        return skeletons.join('');
    }

    // Show progress bar
    showProgress(container, progress = 0) {
        if (typeof container === 'string') {
            container = document.getElementById(container) || document.querySelector(container);
        }
        if (!container) return;

        let progressBar = container.querySelector('.progress-bar-container');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'progress-bar-container';
            progressBar.innerHTML = '<div class="progress-bar" style="width: 0%"></div>';
            container.appendChild(progressBar);
        }

        const bar = progressBar.querySelector('.progress-bar');
        bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
}

// Global instance
window.loadingManager = new LoadingManager();

// Convenience functions
window.showLoading = (text, subtext) => window.loadingManager.show(text, subtext);
window.hideLoading = () => window.loadingManager.hide();
