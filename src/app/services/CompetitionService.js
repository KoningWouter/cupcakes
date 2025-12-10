export default class CompetitionService {
    constructor({ perMinuteLimit = 100 } = {}) {
        this.perMinuteLimit = perMinuteLimit;
        this.keyPool = [];
        this.usage = new Map(); // key -> { windowStart, count }
        this.roundRobinIndex = 0;
    }

    updateKeys(primaryKey, additionalKeys = []) {
        const pool = [primaryKey, ...additionalKeys].filter(Boolean);
        this.keyPool = pool;
        // Reset usage for keys that no longer exist
        [...this.usage.keys()].forEach(key => {
            if (!pool.includes(key)) this.usage.delete(key);
        });
        this.roundRobinIndex = 0;
    }

    hasKeys() {
        return this.keyPool.length > 0;
    }

    /**
     * Fetch competition snapshot for the current user (home tab).
     */
    async fetchCompetition() {
        const key = this.getAvailableKey();
        if (!key) throw new Error('Rate limit reached for all API keys. Please wait.');
        const endpoint = `https://api.torn.com/v2/user/competition?key=${encodeURIComponent(key)}`;
        const result = await this.makeRequest(endpoint);
        this.registerUse(key);
        this.lastUsedKey = key; // Track last used key
        return result;
    }

    /**
     * Fetch competition data for a specific user (team overview cards).
     * @returns {Promise} Competition data
     */
    async fetchUserCompetition(userId) {
        const key = this.getAvailableKey();
        if (!key) throw new Error('Rate limit reached for all API keys. Please wait.');
        const endpoint = `https://api.torn.com/user/${userId}/competition?key=${encodeURIComponent(key)}`;
        const result = await this.makeRequest(endpoint);
        this.registerUse(key);
        this.lastUsedKey = key; // Track last used key
        return result;
    }

    /**
     * Get the last API key that was used
     */
    getLastUsedKey() {
        return this.lastUsedKey || (this.keyPool.length > 0 ? this.keyPool[0] : null);
    }

    /**
     * Get the number of available API keys
     */
    getKeyCount() {
        return this.keyPool.length;
    }

    /**
     * Calculate the optimal request interval in milliseconds based on available keys
     * Formula: (60 seconds * 1000ms) / (keys * requests_per_minute_per_key)
     * With 100 req/min per key: 60000 / (keys * 100) = 600 / keys ms
     */
    getOptimalInterval() {
        if (this.keyPool.length === 0) return 600; // Default to 600ms if no keys
        const requestsPerSecondPerKey = this.perMinuteLimit / 60; // 100/60 = 1.67 req/s per key
        const totalRequestsPerSecond = requestsPerSecondPerKey * this.keyPool.length;
        const intervalMs = 1000 / totalRequestsPerSecond;
        return Math.ceil(intervalMs); // Round up to avoid going over rate limit
    }

    getAvailableKey() {
        if (this.keyPool.length === 0) return null;

        const now = Date.now();
        const attempts = this.keyPool.length;

        for (let i = 0; i < attempts; i++) {
            const idx = (this.roundRobinIndex + i) % this.keyPool.length;
            const key = this.keyPool[idx];
            const usage = this.usage.get(key) || { windowStart: now, count: 0 };

            // Reset window if needed
            if (now - usage.windowStart >= 60000) {
                usage.windowStart = now;
                usage.count = 0;
            }

            if (usage.count < this.perMinuteLimit) {
                this.roundRobinIndex = idx + 1;
                this.usage.set(key, usage);
                return key;
            }
        }

        return null; // All keys exhausted
    }

    registerUse(key) {
        const now = Date.now();
        const usage = this.usage.get(key) || { windowStart: now, count: 0 };
        if (now - usage.windowStart >= 60000) {
            usage.windowStart = now;
            usage.count = 0;
        }
        usage.count += 1;
        this.usage.set(key, usage);
    }

    async makeRequest(endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.error || 'API error');
        }

        return data.competition || data;
    }
}

