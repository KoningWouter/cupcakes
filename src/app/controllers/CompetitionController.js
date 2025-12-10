export default class CompetitionController {
    constructor({ statusEl, dataEl, competitionService }) {
        this.statusEl = statusEl;
        this.dataEl = dataEl;
        this.competitionService = competitionService;
    }

    async loadCompetition() {
        if (!this.competitionService.hasKeys()) {
            this.updateStatus('Please add your API key in Settings first.');
            return;
        }

        this.updateStatus('Fetching competition data...');
        if (this.dataEl) {
            this.dataEl.innerHTML = '';
        }

        try {
            const data = await this.competitionService.fetchCompetition();
            this.renderCompetitionData(data);
            this.updateStatus('Competition data loaded.');
        } catch (error) {
            console.error('Error fetching competition:', error);
            this.updateStatus(`Error: ${error.message}`);
        }
    }

    renderCompetitionData(data) {
        if (!this.dataEl) return;
        this.dataEl.innerHTML = '';

        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
            this.dataEl.innerHTML = '<p>No competition data found.</p>';
            return;
        }

        const entries = Array.isArray(data) ? data : Object.entries(data).map(([key, value]) => ({ key, value }));

        entries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'competition-item';

            if (entry.key) {
                const title = document.createElement('h4');
                title.textContent = entry.key;
                item.appendChild(title);
            }

            if (typeof entry.value === 'object') {
                Object.entries(entry.value).forEach(([k, v]) => {
                    const p = document.createElement('p');
                    p.textContent = `${k}: ${v}`;
                    item.appendChild(p);
                });
            } else {
                const p = document.createElement('p');
                p.textContent = `${entry.value}`;
                item.appendChild(p);
            }

            this.dataEl.appendChild(item);
        });
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

