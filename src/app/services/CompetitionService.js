export default class CompetitionService {
    /**
     * Fetch competition snapshot for the current user (home tab).
     * @param {string} apiKey
     */
    async fetchCompetition(apiKey) {
        const endpoint = `https://api.torn.com/v2/user/competition?key=${encodeURIComponent(apiKey)}`;
        return this.makeRequest(endpoint);
    }

    /**
     * Fetch competition data for a specific user (team overview cards).
     * @param {string|number} userId
     * @param {string} apiKey
     */
    async fetchUserCompetition(userId, apiKey) {
        const endpoint = `https://api.torn.com/user/${userId}/competition?key=${encodeURIComponent(apiKey)}`;
        return this.makeRequest(endpoint);
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

