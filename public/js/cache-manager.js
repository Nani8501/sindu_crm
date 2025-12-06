// Enhanced Cache Management System with Two Tiers
class CacheManager {
    constructor() {
        this.shortPrefix = 'crm_cache_short_';
        this.longPrefix = 'crm_cache_long_';

        // Short-term cache: 5 minutes (API responses, temporary data)
        this.shortTTL = 5 * 60 * 1000;

        // Long-lasting cache: 30 days (theme, preferences, static data)
        this.longTTL = 30 * 24 * 60 * 60 * 1000;
    }

    // Set short-term cache (5 minutes default)
    setShort(key, data, ttl = this.shortTTL) {
        return this._set(this.shortPrefix + key, data, ttl);
    }

    // Set long-lasting cache (30 days default)
    setLong(key, data, ttl = this.longTTL) {
        return this._set(this.longPrefix + key, data, ttl);
    }

    // Internal set method
    _set(fullKey, data, ttl) {
        try {
            const item = {
                data: data,
                timestamp: Date.now(),
                expires: Date.now() + ttl
            };
            localStorage.setItem(fullKey, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    // Get short-term cache
    getShort(key) {
        return this._get(this.shortPrefix + key);
    }

    // Get long-lasting cache
    getLong(key) {
        return this._get(this.longPrefix + key);
    }

    // Internal get method
    _get(fullKey) {
        try {
            const item = localStorage.getItem(fullKey);
            if (!item) return null;

            const parsed = JSON.parse(item);

            // Check if expired
            if (Date.now() > parsed.expires) {
                localStorage.removeItem(fullKey);
                return null;
            }

            return parsed.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    // Remove specific cache
    removeShort(key) {
        localStorage.removeItem(this.shortPrefix + key);
    }

    removeLong(key) {
        localStorage.removeItem(this.longPrefix + key);
    }

    // Clear all short-term cache
    clearShort() {
        this._clearByPrefix(this.shortPrefix);
    }

    // Clear all long-lasting cache
    clearLong() {
        this._clearByPrefix(this.longPrefix);
    }

    // Clear all cache
    clearAll() {
        this.clearShort();
        this.clearLong();
    }

    // Internal clear by prefix
    _clearByPrefix(prefix) {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
    }

    // Check if cache exists
    hasShort(key) {
        return this.getShort(key) !== null;
    }

    hasLong(key) {
        return this.getLong(key) !== null;
    }

    // Get cache age in seconds
    getAge(key, isLong = false) {
        try {
            const fullKey = (isLong ? this.longPrefix : this.shortPrefix) + key;
            const item = localStorage.getItem(fullKey);
            if (!item) return null;

            const parsed = JSON.parse(item);
            return Math.floor((Date.now() - parsed.timestamp) / 1000);
        } catch (error) {
            return null;
        }
    }

    // Get cache stats
    getStats() {
        const keys = Object.keys(localStorage);
        const shortKeys = keys.filter(k => k.startsWith(this.shortPrefix));
        const longKeys = keys.filter(k => k.startsWith(this.longPrefix));

        return {
            shortTerm: {
                count: shortKeys.length,
                keys: shortKeys.map(k => k.replace(this.shortPrefix, ''))
            },
            longTerm: {
                count: longKeys.length,
                keys: longKeys.map(k => k.replace(this.longPrefix, ''))
            }
        };
    }
}

// User Preferences Management (always uses long-lasting cache)
class PreferencesManager {
    constructor() {
        this.prefix = 'crm_pref_';
    }

    set(key, value) {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
    }

    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    remove(key) {
        localStorage.removeItem(this.prefix + key);
    }
}

// Global instances
window.cacheManager = new CacheManager();
window.prefsManager = new PreferencesManager();

// Helper: Fetch with short-term cache
async function fetchWithCache(url, options = {}, cacheKey, cacheTTL) {
    // Check if caching is allowed
    const consent = JSON.parse(localStorage.getItem('cookie_consent') || '{}');
    if (!consent.preferences?.shortTermCache) {
        console.log('Short-term cache disabled, fetching from API...');
        const response = await fetch(url, options);
        return await response.json();
    }

    // Check cache first
    const cached = window.cacheManager.getShort(cacheKey);
    if (cached) {
        console.log(`✓ Cache hit: ${cacheKey} (age: ${window.cacheManager.getAge(cacheKey)}s)`);
        return cached;
    }

    // Fetch from API
    console.log(`✗ Cache miss: ${cacheKey}, fetching from API...`);
    const response = await fetch(url, options);
    const data = await response.json();

    // Cache the result
    if (data.success) {
        window.cacheManager.setShort(cacheKey, data, cacheTTL);
    }

    return data;
}

// Export for use in other scripts
window.fetchWithCache = fetchWithCache;
