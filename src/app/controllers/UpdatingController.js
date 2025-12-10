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
        this.stateCollection = 'appState';
        this.stateDocId = 'updatingState';
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.startTime = Date.now();
        this.updateStatus('Initializing... Loading all team members from Firebase.');
        this.loadAllMembers();
    }

    destroy() {
        // Don't destroy - keep updating running in background
        // Only stop if explicitly needed (e.g., app shutdown)
        if (this.apiCallInterval) {
            clearInterval(this.apiCallInterval);
            this.apiCallInterval = null;
        }
        this.isInitialized = false;
    }

    /**
     * Save current updating state to Firestore
     */
    async saveCurrentState() {
        if (!window.firebaseDb) return;
        const { doc, setDoc } = window.firebaseFirestore || {};
        if (!doc || !setDoc) return;

        try {
            const stateDoc = doc(window.firebaseDb, this.stateCollection, this.stateDocId);
            await setDoc(stateDoc, {
                currentIndex: this.currentIndex,
                totalProcessed: this.totalProcessed,
                totalErrors: this.totalErrors,
                lastUpdated: new Date().toISOString(),
                allMemberIdsLength: this.allMemberIds.length
            }, { merge: true });
        } catch (err) {
            console.error('Error saving updating state:', err);
        }
    }

    /**
     * Load saved updating state from Firestore
     */
    async loadSavedState() {
        if (!window.firebaseDb) return null;
        const { doc, getDoc } = window.firebaseFirestore || {};
        if (!doc || !getDoc) return null;

        try {
            const stateDoc = doc(window.firebaseDb, this.stateCollection, this.stateDocId);
            const stateSnapshot = await getDoc(stateDoc);
            if (stateSnapshot.exists()) {
                return stateSnapshot.data();
            }
        } catch (err) {
            console.error('Error loading updating state:', err);
        }
        return null;
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

            // Try to load saved state to resume from where we left off
            const savedState = await this.loadSavedState();
            if (savedState && savedState.currentIndex !== undefined) {
                // Validate that saved index is still valid and member list hasn't changed
                const savedIndex = savedState.currentIndex;
                const memberListChanged = savedState.allMemberIdsLength !== this.allMemberIds.length;
                
                if (!memberListChanged && savedIndex >= 0 && savedIndex < this.allMemberIds.length) {
                    // Resume from saved position
                    this.currentIndex = savedIndex;
                    this.totalProcessed = savedState.totalProcessed || 0;
                    this.totalErrors = savedState.totalErrors || 0;
                    this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nResuming from member ${this.currentIndex + 1}/${this.allMemberIds.length}...`);
                } else {
                    // Saved index is invalid or member list changed, start from beginning
                    this.currentIndex = 0;
                    this.totalProcessed = 0;
                    this.totalErrors = 0;
                    if (memberListChanged) {
                        this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nMember list changed since last run. Starting fresh update cycle...`);
                    } else {
                        this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nStarting update cycle...`);
                    }
                }
            } else {
                // No saved state, start from beginning
                this.currentIndex = 0;
                this.totalProcessed = 0;
                this.totalErrors = 0;
                this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nStarting update cycle...`);
            }
            
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
            
            // Save state when restarting cycle
            await this.saveCurrentState();
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
            
            // Save current state after processing each member
            await this.saveCurrentState();
        } catch (error) {
            console.error(`Error fetching competition data for user ${userId}:`, error);
            this.totalErrors++;
            this.updateStatus(`${progress} ✗ Error: ${error.message}\n\nTotal processed: ${this.totalProcessed}\nTotal errors: ${this.totalErrors}`);
            
            // Save state even on error so we don't repeat the same member
            await this.saveCurrentState();
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

