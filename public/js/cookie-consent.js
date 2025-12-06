// Enhanced Cookie Consent Banner with Granular Controls
class CookieConsent {
    constructor() {
        this.consentKey = 'cookie_consent';
        this.init();
    }

    init() {
        // Check if user has already given consent
        const consent = localStorage.getItem(this.consentKey);
        if (consent) {
            this.applyConsent(JSON.parse(consent));
        }

        // Auto-show disabled per user request: "make this don't open default , only when i click cookie-settings-btn"
        // if (!consent) { this.show(); }

        // Always show the floating settings button
        this.createFloatingButton();
    }

    createFloatingButton() {
        // Remove existing button if any
        const existing = document.getElementById('cookie-settings-btn');
        if (existing) existing.remove();

        // Create floating button
        const button = document.createElement('button');
        button.id = 'cookie-settings-btn';
        button.className = 'cookie-floating-btn';
        button.innerHTML = `
            <i class="ri-shield-check-line"></i>
            <span class="cookie-tooltip">Privacy Settings</span>
        `;
        button.onclick = () => this.show();

        document.body.appendChild(button);
        this.addFloatingButtonStyles();

        // Animate on first appearance
        setTimeout(() => button.classList.add('show'), 100);
    }

    addFloatingButtonStyles() {
        if (document.getElementById('cookie-floating-styles')) return;

        const style = document.createElement('style');
        style.id = 'cookie-floating-styles';
        style.textContent = `
            .cookie-floating-btn {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: var(--primary-gradient);
                border: none;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(26, 81, 111, 0.4);
                z-index: 99998;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                transform: scale(0);
                opacity: 0;
            }

            .cookie-floating-btn.show {
                transform: scale(1);
                opacity: 1;
                animation: cookiePulse 2s ease-in-out infinite;
            }

            .cookie-floating-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(26, 81, 111, 0.6);
                animation: none;
            }

            .cookie-floating-btn:active {
                transform: scale(0.95);
            }

            .cookie-tooltip {
                position: absolute;
                right: 100%;
                margin-right: 12px;
                background: var(--bg-card);
                color: var(--text-primary);
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 0.85rem;
                white-space: nowrap;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                border: 1px solid var(--border-color);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s, transform 0.2s;
                transform: translateX(10px);
            }

            .cookie-tooltip::after {
                content: '';
                position: absolute;
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid var(--bg-card);
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
            }

            .cookie-floating-btn:hover .cookie-tooltip {
                opacity: 1;
                transform: translateX(0);
            }

            @keyframes cookiePulse {
                0%, 100% {
                    box-shadow: 0 4px 20px rgba(26, 81, 111, 0.4);
                }
                50% {
                    box-shadow: 0 4px 30px rgba(26, 81, 111, 0.7);
                }
            }

            /* Ripple effect on click */
            .cookie-floating-btn::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: translate(-50%, -50%);
                transition: width 0.6s, height 0.6s;
            }

            .cookie-floating-btn:active::before {
                width: 100%;
                height: 100%;
            }

            @media (max-width: 768px) {
                .cookie-floating-btn {
                    bottom: 15px;
                    right: 15px;
                    width: 48px;
                    height: 48px;
                    font-size: 1.3rem;
                }

                .cookie-tooltip {
                    display: none; /* Hide tooltip on mobile */
                }
            }
        `;
        document.head.appendChild(style);
    }

    show() {
        // Create banner HTML with granular options
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div class="cookie-consent-overlay"></div>
            <div class="cookie-consent-content">
                <button class="cookie-close-btn" onclick="event.stopPropagation();" title="Minimize">
                    <i class="ri-arrow-down-s-line"></i>
                </button>
                
                <div class="cookie-consent-header">
                    <i class="ri-shield-check-line cookie-consent-icon"></i>
                    <div>
                        <h3>Privacy & Data Storage Preferences</h3>
                        <p class="cookie-subtitle">Choose what data we can store to improve your experience</p>
                    </div>
                </div>

                <div class="cookie-consent-options">
                    <!-- Required Cache (Always On) -->
                    <div class="cookie-option required">
                        <div class="cookie-option-header">
                            <label class="cookie-label">
                                <input type="radio" name="required" checked disabled>
                                <span class="cookie-option-title">
                                    <i class="ri-lock-line"></i> Required Storage
                                </span>
                            </label>
                            <span class="cookie-badge required-badge">Required</span>
                        </div>
                        <p class="cookie-option-desc">Essential for login, security tokens, and basic functionality. Cannot be disabled.</p>
                        <small class="cookie-storage-info">📦 Stores: Authentication tokens, session data</small>
                    </div>

                    <!-- Long-Lasting Cache -->
                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-label">
                                <input type="radio" name="longCache" value="accept" id="long-cache-yes" checked>
                                <span class="cookie-option-title">
                                    <i class="ri-time-line"></i> Long-Term Storage (30 days)
                                </span>
                            </label>
                            <div class="cookie-radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="longCache" value="accept" checked> Accept
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="longCache" value="reject"> Reject
                                </label>
                            </div>
                        </div>
                        <p class="cookie-option-desc">Remembers your theme, language, and personal settings for 30 days.</p>
                        <small class="cookie-storage-info">📦 Stores: Theme preference, display settings, dashboard layout</small>
                    </div>

                    <!-- Short-Term Cache -->
                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-label">
                                <input type="radio" name="shortCache" value="accept" id="short-cache-yes" checked>
                                <span class="cookie-option-title">
                                    <i class="ri-flashlight-line"></i> Short-Term Cache (5 minutes)
                                </span>
                            </label>
                            <div class="cookie-radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="shortCache" value="accept" checked> Accept
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="shortCache" value="reject"> Reject
                                </label>
                            </div>
                        </div>
                        <p class="cookie-option-desc">Caches API responses for faster loading. Data refreshes every 5 minutes.</p>
                        <small class="cookie-storage-info">📦 Stores: Course lists, assignments, quiz data (temporary)</small>
                    </div>

                    <!-- Analytics & Performance -->
                    <div class="cookie-option">
                        <div class="cookie-option-header">
                            <label class="cookie-label">
                                <input type="radio" name="analytics" value="accept" id="analytics-yes">
                                <span class="cookie-option-title">
                                    <i class="ri-bar-chart-line"></i> Analytics & Performance
                                </span>
                            </label>
                            <div class="cookie-radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="analytics" value="accept"> Accept
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="analytics" value="reject" checked> Reject
                                </label>
                            </div>
                        </div>
                        <p class="cookie-option-desc">Helps us understand usage patterns to improve the platform.</p>
                        <small class="cookie-storage-info">📦 Stores: Page views, feature usage statistics (anonymous)</small>
                    </div>
                </div>

                <div class="cookie-consent-actions">
                    <button class="btn btn-secondary" onclick="cookieConsent.saveCustom()">
                        <i class="ri-settings-3-line"></i> Save Custom Settings
                    </button>
                    <button class="btn btn-outline" onclick="cookieConsent.acceptRequired()">
                        Accept Required Only
                    </button>
                    <button class="btn btn-primary" onclick="cookieConsent.acceptAll()">
                        <i class="ri-check-line"></i> Accept All
                    </button>
                </div>

                <p class="cookie-privacy-link">
                    <i class="ri-information-line"></i> Learn more about our <a href="/privacy-policy.html" target="_blank">Privacy Policy</a>
                </p>
            </div>
        `;
        document.body.appendChild(banner);
        this.addStyles();
    }

    addStyles() {
        if (document.getElementById('cookie-consent-styles')) return;

        const style = document.createElement('style');
        style.id = 'cookie-consent-styles';
        style.textContent = `
            #cookie-consent-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            }

            .cookie-consent-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
            }

            .cookie-consent-content {
                position: relative;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 16px;
                padding: 2rem;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                z-index: 1;
                animation: slideInScale 0.4s ease-out;
            }

            .cookie-close-btn {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: var(--bg-tertiary);
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-secondary);
                transition: all 0.2s;
            }

            .cookie-close-btn:hover {
                background: var(--primary-color);
                color: white;
            }

            .cookie-consent-header {
                display: flex;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .cookie-consent-icon {
                font-size: 2.5rem;
                color: var(--primary-color);
                flex-shrink: 0;
            }

            .cookie-consent-header h3 {
                margin: 0 0 0.25rem 0;
                color: var(--text-primary);
                font-size: 1.35rem;
            }

            .cookie-subtitle {
                margin: 0;
                color: var(--text-secondary);
                font-size: 0.9rem;
            }

            .cookie-consent-options {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .cookie-option {
                background: var(--bg-tertiary);
                border: 2px solid transparent;
                border-radius: 12px;
                padding: 1rem;
                transition: all 0.2s;
            }

            .cookie-option:hover {
                border-color: var(--primary-color);
                background: var(--bg-secondary);
            }

            .cookie-option.required {
                border-color: var(--border-color);
                opacity: 0.9;
            }

            .cookie-option-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .cookie-label {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                margin: 0;
            }

            .cookie-option-title {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
                color: var(--text-primary);
                font-size: 0.95rem;
            }

            .cookie-option-title i {
                font-size: 1.1rem;
                color: var(--primary-color);
            }

            .cookie-radio-group {
                display: flex;
                gap: 1rem;
            }

            .radio-option {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                font-size: 0.85rem;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .radio-option:hover {
                background: var(--bg-glass);
                color: var(--text-primary);
            }

            .radio-option input[type="radio"] {
                cursor: pointer;
            }

            .cookie-badge {
                font-size: 0.75rem;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                font-weight: 600;
            }

            .required-badge {
                background: var(--primary-color);
                color: white;
            }

            .cookie-option-desc {
                margin: 0.5rem 0;
                font-size: 0.9rem;
                color: var(--text-secondary);
                line-height: 1.4;
            }

            .cookie-storage-info {
                display: block;
                color: var(--text-muted);
                font-size: 0.8rem;
                margin-top: 0.5rem;
                padding: 0.5rem;
                background: var(--bg-glass);
                border-radius: 6px;
            }

            .cookie-consent-actions {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
            }

            .cookie-consent-actions .btn {
                flex: 1;
                min-width: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }

            .btn-outline {
                background: transparent;
                color: var(--text-primary);
                border: 2px solid var(--border-color);
            }

            .btn-outline:hover {
                border-color: var(--primary-color);
                background: var(--bg-glass);
            }

            .cookie-privacy-link {
                text-align: center;
                margin-top: 1rem;
                font-size: 0.85rem;
                color: var(--text-muted);
            }

            .cookie-privacy-link a {
                color: var(--primary-color);
                text-decoration: none;
            }

            .cookie-privacy-link a:hover {
                text-decoration: underline;
            }

            @keyframes slideInScale {
                from {
                    transform: scale(0.9) translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }
            }

            @media (max-width: 768px) {
                .cookie-consent-content {
                    max-width: 95%;
                    padding: 1.5rem;
                    margin: 1rem;
                }

                .cookie-consent-actions {
                    flex-direction: column;
                }

                .cookie-consent-actions .btn {
                    width: 100%;
                    min-width: unset;
                }

                .cookie-radio-group {
                    flex-direction: column;
                    gap: 0.5rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    acceptAll() {
        const consent = {
            accepted: true,
            timestamp: Date.now(),
            preferences: {
                longTermCache: true,
                shortTermCache: true,
                analytics: true,
                personalization: true
            }
        };
        this.saveConsent(consent);
    }

    acceptRequired() {
        const consent = {
            accepted: false,
            timestamp: Date.now(),
            preferences: {
                longTermCache: false,
                shortTermCache: false,
                analytics: false,
                personalization: false
            }
        };
        this.saveConsent(consent);
        window.notify?.info('Only required storage enabled. Some features may be limited.');
    }

    saveCustom() {
        const longCache = document.querySelector('input[name="longCache"]:checked').value === 'accept';
        const shortCache = document.querySelector('input[name="shortCache"]:checked').value === 'accept';
        const analytics = document.querySelector('input[name="analytics"]:checked').value === 'accept';

        const consent = {
            accepted: longCache || shortCache || analytics,
            timestamp: Date.now(),
            preferences: {
                longTermCache: longCache,
                shortTermCache: shortCache,
                analytics: analytics,
                personalization: longCache
            }
        };
        this.saveConsent(consent);
    }

    saveConsent(consent) {
        localStorage.setItem(this.consentKey, JSON.stringify(consent));
        this.applyConsent(consent);
        this.hide();

        // Show notification based on what was accepted
        const enabled = [];
        if (consent.preferences.longTermCache) enabled.push('long-term storage');
        if (consent.preferences.shortTermCache) enabled.push('short-term cache');
        if (consent.preferences.analytics) enabled.push('analytics');

        if (enabled.length > 0) {
            window.notify?.success(`Privacy settings saved. Enabled: ${enabled.join(', ')}`);
        } else {
            window.notify?.info('Privacy settings saved. Only required storage enabled.');
        }
    }

    applyConsent(consent) {
        // Clear caches if not consented
        if (!consent.preferences.shortTermCache) {
            window.cacheManager?.clearShort();
        }
        if (!consent.preferences.longTermCache) {
            window.cacheManager?.clearLong();
            // Remove theme preference if long-term cache disabled
            localStorage.removeItem('theme');
        }

        // Store globally
        window.cookieConsentData = consent;
    }

    hide() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => banner.remove(), 300);
        }
    }

    reset() {
        localStorage.removeItem(this.consentKey);
        location.reload();
    }
}

// Initialize on page load
window.cookieConsent = new CookieConsent();
