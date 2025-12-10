export default class UpdatingController {
    constructor({ statusEl, competitionService, apiKeyDisplayEl }) {
        this.statusEl = statusEl;
        this.competitionService = competitionService;
        this.apiKeyDisplayEl = apiKeyDisplayEl;

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

    /**
     * Get the current API call rate based on available keys
     */
    getApiCallRate() {
        return this.competitionService.getOptimalInterval();
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
     * Saves to appState/updatingState document for resuming later
     */
    async saveCurrentState() {
        if (!window.firebaseDb) {
            console.warn('Firebase not initialized, cannot save state');
            return;
        }
        
        const { doc, setDoc } = window.firebaseFirestore || {};
        if (!doc || !setDoc) {
            console.warn('Firestore functions not available, cannot save state');
            return;
        }

        try {
            const stateDoc = doc(window.firebaseDb, this.stateCollection, this.stateDocId);
            const stateData = {
                currentIndex: this.currentIndex,
                totalProcessed: this.totalProcessed,
                totalErrors: this.totalErrors,
                lastUpdated: new Date().toISOString(),
                allMemberIdsLength: this.allMemberIds.length
            };
            
            await setDoc(stateDoc, stateData, { merge: true });
            console.log(`Saved state to Firestore: index=${this.currentIndex}, processed=${this.totalProcessed}, errors=${this.totalErrors}`);
        } catch (err) {
            console.error('Error saving updating state to Firestore:', err);
        }
    }

    /**
     * Load saved updating state from Firestore
     * This fetches the appState/updatingState document to resume from the last saved position
     */
    async loadSavedState() {
        if (!window.firebaseDb) {
            console.log('Firebase not initialized, cannot load saved state');
            return null;
        }
        
        const { doc, getDoc } = window.firebaseFirestore || {};
        if (!doc || !getDoc) {
            console.log('Firestore functions not available');
            return null;
        }

        try {
            console.log(`Loading saved state from Firestore: ${this.stateCollection}/${this.stateDocId}`);
            const stateDoc = doc(window.firebaseDb, this.stateCollection, this.stateDocId);
            const stateSnapshot = await getDoc(stateDoc);
            
            if (stateSnapshot.exists()) {
                const data = stateSnapshot.data();
                console.log('Loaded saved state:', {
                    currentIndex: data.currentIndex,
                    totalProcessed: data.totalProcessed,
                    totalErrors: data.totalErrors,
                    allMemberIdsLength: data.allMemberIdsLength,
                    lastUpdated: data.lastUpdated
                });
                return data;
            } else {
                console.log('No saved state found in Firestore, starting fresh');
            }
        } catch (err) {
            console.error('Error loading updating state from Firestore:', err);
            this.updateStatus(`Warning: Could not load saved state: ${err.message}\nStarting from beginning.`);
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

            // Fetch saved state from Firestore appState collection to resume from last position
            this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nFetching saved state from Firestore...`);
            const savedState = await this.loadSavedState();
            
            if (savedState && savedState.currentIndex !== undefined) {
                // Validate that saved index is still valid and member list hasn't changed
                const savedIndex = savedState.currentIndex;
                const memberListChanged = savedState.allMemberIdsLength !== this.allMemberIds.length;
                
                if (!memberListChanged && savedIndex >= 0 && savedIndex < this.allMemberIds.length) {
                    // Resume from saved position - the saved index is the next member to process
                    this.currentIndex = savedIndex;
                    this.totalProcessed = savedState.totalProcessed || 0;
                    this.totalErrors = savedState.totalErrors || 0;
                    
                    const resumeMessage = `✓ Loaded saved state from Firestore\n` +
                                        `Resuming from member ${this.currentIndex + 1}/${this.allMemberIds.length} (index ${this.currentIndex})\n` +
                                        `Previously processed: ${this.totalProcessed} members\n` +
                                        `Total errors: ${this.totalErrors}\n` +
                                        `Last updated: ${savedState.lastUpdated ? new Date(savedState.lastUpdated).toLocaleString() : 'Unknown'}`;
                    this.updateStatus(resumeMessage);
                    console.log(`Resuming from saved index: ${savedIndex} (member ${savedIndex + 1} of ${this.allMemberIds.length})`);
                } else {
                    // Saved index is invalid or member list changed, start from beginning
                    this.currentIndex = 0;
                    this.totalProcessed = 0;
                    this.totalErrors = 0;
                    if (memberListChanged) {
                        this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nMember list changed (was ${savedState.allMemberIdsLength}, now ${this.allMemberIds.length}).\nStarting fresh update cycle...`);
                    } else if (savedIndex >= this.allMemberIds.length) {
                        this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nSaved index (${savedIndex}) exceeds member count. Starting fresh update cycle...`);
                    } else {
                        this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nInvalid saved state. Starting fresh update cycle...`);
                    }
                }
            } else {
                // No saved state found, start from beginning
                this.currentIndex = 0;
                this.totalProcessed = 0;
                this.totalErrors = 0;
                this.updateStatus(`Loaded ${this.allMemberIds.length} team members.\nNo saved state found. Starting fresh update cycle...`);
            }
            
            // Update API key display on initialization
            this.updateApiKeyDisplay();
            
            this.startApiCallProcessor();
        } catch (error) {
            console.error('Error loading team members:', error);
            this.updateStatus(`Error loading members: ${error.message}`);
        }
    }

    startApiCallProcessor() {
        if (this.apiCallInterval) clearInterval(this.apiCallInterval);
        
        // Dynamically calculate interval based on available API keys
        const interval = this.getApiCallRate();
        this.apiCallInterval = setInterval(() => this.processNextMember(), interval);
        
        // Update API key display
        this.updateApiKeyDisplay();
        
        // Process first member immediately
        this.processNextMember();
    }

    updateApiKeyDisplay() {
        if (!this.apiKeyDisplayEl) return;
        const keyCount = this.competitionService.getKeyCount();
        const lastKey = this.competitionService.getLastUsedKey();
        const interval = this.getApiCallRate();
        
        let displayText = `API Keys: ${keyCount} active`;
        if (keyCount > 0) {
            displayText += ` | Current: ${lastKey ? (lastKey.substring(0, 8) + '...') : 'N/A'}`;
            displayText += ` | Rate: ${keyCount * 100} req/min (${interval}ms interval)`;
        }
        
        this.apiKeyDisplayEl.textContent = displayText;
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
            
            // Update API key display after each request
            this.updateApiKeyDisplay();
            
            this.updateStatus(`${progress} ✓\n\nTotal processed: ${this.totalProcessed}\nTotal errors: ${this.totalErrors}`);
            
            // Save current state after processing each member
            await this.saveCurrentState();
        } catch (error) {
            console.error(`Error fetching competition data for user ${userId}:`, error);
            this.totalErrors++;
            
            // Update API key display even on error
            this.updateApiKeyDisplay();
            
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

