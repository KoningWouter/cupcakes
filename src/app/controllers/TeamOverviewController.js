export default class TeamOverviewController {
    constructor({ container, grid, statusEl, storageKey, competitionService, apiCallRate = 600, cacheExpiry = 60000 }) {
        this.container = container;
        this.grid = grid;
        this.statusEl = statusEl;
        this.storageKey = storageKey;
        this.competitionService = competitionService;
        this.apiCallRate = apiCallRate;
        this.cacheExpiry = cacheExpiry;

        this.loadingMoreMembers = false;
        this.lastMemberDoc = null;
        this.hasMoreMembers = true;
        this.loadedMembersCount = 0;
        this.apiCallQueue = [];
        this.apiCallInterval = null;
        this.visibleCards = new Map();
        this.cardObserver = null;
        this.updateInterval = null;
        this.scrollHandler = null;
    }

    init() {
        if (!this.container || !this.grid) return;

        // Reset state
        this.loadingMoreMembers = false;
        this.lastMemberDoc = null;
        this.hasMoreMembers = true;
        this.loadedMembersCount = 0;
        this.apiCallQueue = [];
        this.visibleCards.clear();
        this.competitionDataCache = new Map();

        this.grid.innerHTML = '';

        if (this.scrollHandler && this.container) {
            this.container.removeEventListener('scroll', this.scrollHandler);
        }

        this.scrollHandler = () => this.handleScroll();
        this.container.addEventListener('scroll', this.scrollHandler);

        this.setupCardObserver();
        this.startPeriodicUpdates();
        this.startApiCallProcessor();
        this.loadBatch();
    }

    destroy() {
        if (this.cardObserver) this.cardObserver.disconnect();
        if (this.apiCallInterval) clearInterval(this.apiCallInterval);
        if (this.updateInterval) clearInterval(this.updateInterval);
        if (this.container && this.scrollHandler) {
            this.container.removeEventListener('scroll', this.scrollHandler);
        }
        this.apiCallQueue = [];
        this.visibleCards.clear();
    }

    handleScroll() {
        if (!this.container || this.loadingMoreMembers || !this.hasMoreMembers) return;

        const { scrollTop, scrollHeight, clientHeight } = this.container;
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            this.loadBatch();
        }
    }

    async loadBatch() {
        if (!window.firebaseDb) {
            this.updateStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }
        if (this.loadingMoreMembers || !this.hasMoreMembers) return;

        this.loadingMoreMembers = true;
        const loader = document.getElementById('teamOverviewLoader');
        if (loader && this.loadedMembersCount > 0) loader.style.display = 'block';
        if (this.loadedMembersCount === 0) this.updateStatus('Loading team members from Firebase...');

        try {
            const { collection, getDocs, query, orderBy, limit, startAfter } = window.firebaseFirestore;
            if (!collection || !getDocs || !query || !orderBy || !limit) {
                throw new Error('Firestore functions not available');
            }

            const batchSize = 50;
            const ref = collection(window.firebaseDb, 'teamMembers');
            const q = this.lastMemberDoc
                ? query(ref, orderBy('level', 'desc'), startAfter(this.lastMemberDoc), limit(batchSize))
                : query(ref, orderBy('level', 'desc'), limit(batchSize));

            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                if (this.loadedMembersCount === 0) {
                    this.updateStatus('No team members found in Firebase. Go to "Upload Members" tab to upload them.');
                } else {
                    this.hasMoreMembers = false;
                    if (loader) loader.style.display = 'none';
                }
                this.loadingMoreMembers = false;
                return;
            }

            const members = [];
            let lastDoc = null;
            querySnapshot.forEach((docSnapshot) => {
                members.push(docSnapshot.data());
                lastDoc = docSnapshot;
            });

            if (members.length < batchSize) this.hasMoreMembers = false;

            this.lastMemberDoc = lastDoc;
            this.loadedMembersCount += members.length;
            this.appendMembers(members);

            if (!this.hasMoreMembers) {
                this.updateStatus(`Loaded all ${this.loadedMembersCount} team members.`);
            } else {
                this.updateStatus(`Loaded ${this.loadedMembersCount} team members. Scroll for more...`);
            }
        } catch (error) {
            console.error('Error loading team overview batch:', error);
            this.updateStatus(`Error: ${error.message}`);
        } finally {
            this.loadingMoreMembers = false;
            const loader = document.getElementById('teamOverviewLoader');
            if (loader) loader.style.display = 'none';
        }
    }

    appendMembers(members) {
        if (!this.grid) return;

        members.forEach(member => {
            const item = this.createMemberItem(member);
            this.grid.appendChild(item);
            if (this.cardObserver) this.cardObserver.observe(item);
        });
    }

    createMemberItem(member) {
        const item = document.createElement('div');
        item.className = 'competition-item';
        item.setAttribute('data-user-id', member.userID);

        const title = document.createElement('h4');
        title.textContent = member.playername || `User ${member.userID}`;
        item.appendChild(title);

        const levelP = document.createElement('p');
        levelP.innerHTML = `<strong>Level:</strong> ${member.level || 0}`;
        item.appendChild(levelP);

        if (member.status && Array.isArray(member.status) && member.status.length > 0) {
            const statusP = document.createElement('p');
            const statusColor = member.status[0] || 'unknown';
            const statusText = member.status[1] || member.status[0] || 'Unknown';
            statusP.innerHTML = `<strong>Status:</strong> <span style="color: ${statusColor}">${statusText}</span>`;
            item.appendChild(statusP);
        }

        if (member.attacks !== undefined) {
            const attacksP = document.createElement('p');
            attacksP.innerHTML = `<strong>Attacks:</strong> ${member.attacks}`;
            item.appendChild(attacksP);
        }

        if (member.honorID) {
            const honorP = document.createElement('p');
            honorP.innerHTML = `<strong>Honor ID:</strong> ${member.honorID}`;
            item.appendChild(honorP);
        }

        if (member.team) {
            const teamP = document.createElement('p');
            teamP.innerHTML = `<strong>Team:</strong> ${member.team}`;
            teamP.style.color = 'var(--color-coral)';
            teamP.style.fontWeight = '600';
            item.appendChild(teamP);
        }

        const competitionContainer = document.createElement('div');
        competitionContainer.className = 'competition-data-container';
        competitionContainer.style.marginTop = '0.5rem';
        competitionContainer.style.paddingTop = '0.5rem';
        competitionContainer.style.borderTop = '1px solid rgba(0,0,0,0.1)';
        competitionContainer.innerHTML = '<p style="font-size: 0.9rem; color: #999; font-style: italic;">Loading competition data...</p>';
        item.appendChild(competitionContainer);

        const idP = document.createElement('p');
        idP.innerHTML = `<strong>User ID:</strong> ${member.userID}`;
        idP.style.fontSize = '0.9rem';
        idP.style.color = '#777';
        item.appendChild(idP);

        return item;
    }

    setupCardObserver() {
        if (!this.container) return;

        if (this.cardObserver) this.cardObserver.disconnect();

        this.cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const userId = card.getAttribute('data-user-id');
                if (!userId) return;

                if (entry.isIntersecting) {
                    this.visibleCards.set(userId, card);
                    this.scheduleCompetitionUpdate(userId);
                } else {
                    this.visibleCards.delete(userId);
                    this.apiCallQueue = this.apiCallQueue.filter(item => item.userId !== userId);
                }
            });
        }, {
            root: this.container,
            rootMargin: '0px',
            threshold: 0.01
        });
    }

    scheduleCompetitionUpdate(userId) {
        const card = this.visibleCards.get(userId);
        if (!card || !this.isCardInViewport(card)) return;

        const apiKey = localStorage.getItem(this.storageKey);
        if (!apiKey) {
            const container = card.querySelector('.competition-data-container');
            if (container) {
                container.innerHTML = '<p style="font-size: 0.9rem; color: #999;">API key required. Add it in Settings.</p>';
            }
            return;
        }

        const cached = this.competitionDataCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            if (this.isCardInViewport(card)) {
                this.updateCardCompetitionData(userId, cached.data);
            }
            return;
        }

        if (this.apiCallQueue.find(item => item.userId === userId)) return;
        if (this.isCardInViewport(card)) {
            this.apiCallQueue.push({ userId, priority: 1 });
        }
    }

    startApiCallProcessor() {
        if (this.apiCallInterval) clearInterval(this.apiCallInterval);
        this.apiCallInterval = setInterval(() => this.processApiCallQueue(), this.apiCallRate);
    }

    async processApiCallQueue() {
        if (this.apiCallQueue.length === 0) return;

        const apiKey = localStorage.getItem(this.storageKey);
        if (!apiKey) {
            this.apiCallQueue = [];
            return;
        }

        const item = this.apiCallQueue.shift();
        const { userId } = item;

        if (!this.visibleCards.has(userId)) return;

        const card = this.visibleCards.get(userId);
        if (!card || !this.isCardInViewport(card)) {
            this.visibleCards.delete(userId);
            return;
        }

        try {
            const data = await this.competitionService.fetchUserCompetition(userId, apiKey);
            this.competitionDataCache.set(userId, { data, timestamp: Date.now() });
            if (this.visibleCards.has(userId) && this.isCardInViewport(card)) {
                this.updateCardCompetitionData(userId, data);
            }
        } catch (error) {
            console.error(`Error fetching competition data for user ${userId}:`, error);
            if (this.visibleCards.has(userId) && this.isCardInViewport(card)) {
                this.updateCardCompetitionData(userId, null, error.message);
            }
        }
    }

    isCardInViewport(card) {
        if (!card || !this.container) return false;

        const cardRect = card.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        return (
            cardRect.top < containerRect.bottom &&
            cardRect.bottom > containerRect.top &&
            cardRect.left < containerRect.right &&
            cardRect.right > containerRect.left
        );
    }

    updateCardCompetitionData(userId, competitionData, errorMessage = null) {
        const card = this.visibleCards.get(userId);
        if (!card) return;

        const container = card.querySelector('.competition-data-container');
        if (!container) return;

        if (errorMessage) {
            container.innerHTML = `<p style="font-size: 0.9rem; color: #e74c3c;">Error: ${errorMessage}</p>`;
            return;
        }

        if (!competitionData || Object.keys(competitionData).length === 0) {
            container.innerHTML = '<p style="font-size: 0.9rem; color: #999;">No competition data</p>';
            return;
        }

        let html = '<div style="font-size: 0.85rem;">';
        html += '<strong style="color: var(--color-coral);">Competition:</strong><br>';

        Object.entries(competitionData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                const displayKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                html += `<span style="color: #555;">${displayKey}:</span> <strong>${value}</strong><br>`;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    startPeriodicUpdates() {
        if (this.updateInterval) clearInterval(this.updateInterval);

        this.updateInterval = setInterval(() => {
            const cardsToUpdate = [];
            this.visibleCards.forEach((card, userId) => {
                if (this.isCardInViewport(card)) {
                    cardsToUpdate.push(userId);
                } else {
                    this.visibleCards.delete(userId);
                    this.apiCallQueue = this.apiCallQueue.filter(item => item.userId !== userId);
                }
            });

            cardsToUpdate.forEach(userId => this.scheduleCompetitionUpdate(userId));
        }, 30000);
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

