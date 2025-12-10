export default class CompetitionService {
    constructor({ perMinuteLimit = 100 } = {}) {
        this.perMinuteLimit = perMinuteLimit;
        this.keyPool = [];
        this.usage = new Map(); // key -> { windowStart, count }
        this.roundRobinIndex = 0;
    }

    setKeys(keys = []) {
        const pool = keys.filter(Boolean);
        this.keyPool = pool;
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
        return result;
    }

    /**
     * Fetch competition data for a specific user (team overview cards).
     */
    async fetchUserCompetition(userId) {
        const key = this.getAvailableKey();
        if (!key) throw new Error('Rate limit reached for all API keys. Please wait.');
        const endpoint = `https://api.torn.com/user/${userId}/competition?key=${encodeURIComponent(key)}`;
        const result = await this.makeRequest(endpoint);
        this.registerUse(key);
        return result;
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

