export default class UpdatingController {
    constructor({ statusEl, competitionService, apiCallRate = 600 }) {
        this.statusEl = statusEl;
        this.competitionService = competitionService;
        this.apiCallRate = apiCallRate;

        this.allMemberIds = [];
        this.currentIndex = 0;
        this.apiCallInterval = null;
        this.totalProcessed = 0;
        this.totalErrors = 0;
        this.isInitialized = false;
        this.startTime = null;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.startTime = Date.now();
        this.updateStatus('Initializing... Loading all team members from Firebase.');
        this.loadAllMembers();
    }

    destroy() {
        if (this.apiCallInterval) {
            clearInterval(this.apiCallInterval);
            this.apiCallInterval = null;
        }
        this.isInitialized = false;
    }

    async loadAllMembers() {
        if (!window.firebaseDb) {
            this.updateStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        try {
            const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
            if (!collection || !getDocs || !query || !orderBy) {
                throw new Error('Firestore functions not available');
            }

            const ref = collection(window.firebaseDb, 'teamMembers');
            const q = query(ref, orderBy('level', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                this.updateStatus('No team members found in Firebase.\nGo to "Upload Members" tab to upload them.');
                return;
            }

            this.allMemberIds = [];
            querySnapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                if (data.userID) {
                    this.allMemberIds.push(data.userID.toString());
                }
            });

            if (this.allMemberIds.length === 0) {
                this.updateStatus('No valid team members found.');
                return;
            }

            this.currentIndex = 0;
            this.totalProcessed = 0;
            this.totalErrors = 0;
            this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nStarting update cycle...`);
            this.startApiCallProcessor();
        } catch (error) {
            console.error('Error loading team members:', error);
            this.updateStatus(`Error loading members: ${error.message}`);
        }
    }

    startApiCallProcessor() {
        if (this.apiCallInterval) clearInterval(this.apiCallInterval);
        this.apiCallInterval = setInterval(() => this.processNextMember(), this.apiCallRate);
        // Process first member immediately
        this.processNextMember();
    }

    async processNextMember() {
        if (this.allMemberIds.length === 0) {
            this.updateStatus('No team members to process.');
            return;
        }

        if (!this.competitionService.hasKeys()) {
            this.updateStatus('API key required. Add it in Settings.\n\nWaiting for API keys...');
            return;
        }

        // If we've processed all members, restart cycle
        if (this.currentIndex >= this.allMemberIds.length) {
            this.currentIndex = 0;
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateStatus(`Completed full cycle of ${this.allMemberIds.length} members.\nRestarting from beginning...\n\nTotal processed: ${this.totalProcessed}\nTotal errors: ${this.totalErrors}\nTime elapsed: ${elapsed}s`);
        }

        const userId = this.allMemberIds[this.currentIndex];
        this.currentIndex++;

        const progress = `Processing ${this.currentIndex}/${this.allMemberIds.length}: User ${userId}`;
        this.updateStatus(`${progress}\n\nTotal processed: ${this.totalProcessed}\nTotal errors: ${this.totalErrors}`);

        try {
            const data = await this.competitionService.fetchUserCompetition(userId);
            await this.persistCompetitionScore(userId, data);
            this.totalProcessed++;
            this.updateStatus(`${progress} ✓\n\nTotal processed: ${this.totalProcessed}\nTotal errors: ${this.totalErrors}`);
        } catch (error) {
            console.error(`Error fetching competition data for user ${userId}:`, error);
            this.totalErrors++;
            this.updateStatus(`${progress} ✗ Error: ${error.message}\n\nTotal processed: ${this.totalProcessed}\nTotal errors: ${this.totalErrors}`);
        }
    }

    /**
     * Persist the current competition score for the user to Firebase.
     */
    async persistCompetitionScore(userId, competitionData) {
        if (!window.firebaseDb) return;
        const { doc, setDoc } = window.firebaseFirestore || {};
        if (!doc || !setDoc) return;

        const currentScore = competitionData?.current ?? competitionData?.score ?? null;
        try {
            const memberDoc = doc(window.firebaseDb, 'teamMembers', userId.toString());
            await setDoc(memberDoc, {
                competitionCurrent: currentScore,
                competitionSnapshot: competitionData || null,
                competitionUpdatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.error(`Error persisting competition score for ${userId}:`, err);
            throw err;
        }
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

