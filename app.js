/**
 * Team Cupcake Web App
 * Main application controller
 */

class CupcakesApp {
    constructor() {
        this.tabs = [];
        this.activeTab = null;
        this.apiKeyStorageKey = 'cupcakes_api_key';
        this.apiKeyInput = null;
        this.apiSaveButton = null;
        this.settingsStatus = null;
        this.competitionStatus = null;
        this.competitionData = null;
        this.teamStatus = null;
        this.teamMembersGrid = null;
        this.teamOverviewStatus = null;
        this.teamOverviewGrid = null;
        this.teamOverviewContainer = null;
        this.loadingMoreMembers = false;
        this.lastMemberDoc = null;
        this.hasMoreMembers = true;
        this.loadedMembersCount = 0;
        this.apiCallQueue = [];
        this.apiCallInterval = null;
        this.apiCallRate = 600; // 600ms between calls = ~100 calls per minute
        this.visibleCards = new Map(); // Map of userID -> card element
        this.cardObserver = null;
        this.competitionDataCache = new Map(); // Cache competition data to avoid redundant calls
        this.cacheExpiry = 60000; // 1 minute cache expiry
        this.updateInterval = null;
        this.cupcakes = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.animationFrameId = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupTabs();
        this.cacheSettingsElements();
        this.cacheCompetitionElements();
        this.cacheTeamElements();
        this.attachEventListeners();
        this.loadInitialTab();
        this.loadSavedApiKey();
        this.fetchCompetition();
        this.createDancingCupcakes();
        this.startApiCallProcessor();
    }

    /**
     * Setup tab system
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');

        tabButtons.forEach((button, index) => {
            const tabId = button.getAttribute('data-tab');
            const panel = document.getElementById(tabId);

            if (panel) {
                this.tabs.push({
                    id: tabId,
                    button: button,
                    panel: panel,
                    index: index
                });
            }
        });
    }

    /**
     * Cache DOM references for settings elements
     */
    cacheSettingsElements() {
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.apiSaveButton = document.getElementById('saveApiKeyButton');
        this.settingsStatus = document.getElementById('settingsStatus');
        this.deleteStatus = document.getElementById('deleteStatus');
    }

    /**
     * Cache DOM references for competition UI
     */
    cacheCompetitionElements() {
        this.competitionStatus = document.getElementById('competitionStatus');
        this.competitionData = document.getElementById('competitionData');
    }

    /**
     * Cache DOM references for team UI
     */
    cacheTeamElements() {
        this.teamStatus = document.getElementById('teamStatus');
        this.teamMembersGrid = document.getElementById('teamMembersGrid');
        this.teamOverviewStatus = document.getElementById('teamOverviewStatus');
        this.teamOverviewGrid = document.getElementById('teamOverviewGrid');
        this.teamOverviewContainer = document.getElementById('teamOverviewContainer');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.tabs.forEach(tab => {
            tab.button.addEventListener('click', () => {
                this.switchTab(tab.id);
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });

        // Settings form handling
        if (this.apiSaveButton && this.apiKeyInput) {
            this.apiSaveButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveApiKey();
            });
        }

        if (this.apiKeyInput) {
            this.apiKeyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveApiKey();
                }
            });
        }

        // Team upload button
        const uploadTeamButton = document.getElementById('uploadTeamButton');
        if (uploadTeamButton) {
            uploadTeamButton.addEventListener('click', () => {
                this.uploadTeamMembers();
            });
        }

        // Delete all data button
        const deleteAllDataButton = document.getElementById('deleteAllDataButton');
        if (deleteAllDataButton) {
            deleteAllDataButton.addEventListener('click', () => {
                this.deleteAllDatabaseData();
            });
        }

        // Auto-load team members when tab is opened
        // This helps with initial loading if data already exists
        if (document.getElementById('team')) {
            // Will be called when tab is switched to
        }

        // Mouse tracking for interactive cupcakes
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        // Window resize handling
        window.addEventListener('resize', () => {
            this.updateCupcakePositions();
        });
    }

    /**
     * Load the initial active tab
     */
    loadInitialTab() {
        const activeTab = this.tabs.find(tab => tab.button.classList.contains('active'));
        if (activeTab) {
            this.activeTab = activeTab.id;
        }
    }

    /**
     * Switch to a different tab
     * @param {string} tabId - The ID of the tab to switch to
     */
    switchTab(tabId) {
        const targetTab = this.tabs.find(tab => tab.id === tabId);
        
        if (!targetTab || this.activeTab === tabId) {
            return;
        }

        // Deactivate current tab
        if (this.activeTab) {
            const currentTab = this.tabs.find(tab => tab.id === this.activeTab);
            if (currentTab) {
                currentTab.button.classList.remove('active');
                currentTab.button.setAttribute('aria-selected', 'false');
                currentTab.panel.classList.remove('active');
            }
        }

        // Activate new tab
        targetTab.button.classList.add('active');
        targetTab.button.setAttribute('aria-selected', 'true');
        targetTab.panel.classList.add('active');
        
        this.activeTab = tabId;

        // Trigger custom event for tab change
        this.onTabChange(tabId);
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardNavigation(e) {
        if (e.ctrlKey || e.metaKey) {
            const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
            
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                e.preventDefault();
                this.switchTab(this.tabs[currentIndex - 1].id);
            } else if (e.key === 'ArrowRight' && currentIndex < this.tabs.length - 1) {
                e.preventDefault();
                this.switchTab(this.tabs[currentIndex + 1].id);
            }
        }
    }

    /**
     * Callback when tab changes
     * @param {string} tabId - The ID of the newly active tab
     */
    onTabChange(tabId) {
        // This can be extended for tab-specific functionality
        console.log(`Switched to tab: ${tabId}`);
        
        // Example: Load content dynamically based on tab
        switch(tabId) {
            case 'gallery':
                this.loadGallery();
                break;
            case 'menu':
                this.loadMenu();
                break;
            case 'settings':
                this.loadSavedApiKey();
                break;
            case 'home':
                this.fetchCompetition();
                break;
            case 'team':
                // Upload tab - no auto-load needed
                break;
            case 'teamCupcake':
                this.initTeamOverview();
                break;
            default:
                // Stop updates when switching away from team overview
                if (tabId !== 'teamCupcake' && this.updateInterval) {
                    clearInterval(this.updateInterval);
                    this.updateInterval = null;
                }
                if (tabId !== 'teamCupcake' && this.cardObserver) {
                    this.cardObserver.disconnect();
                }
                if (tabId !== 'teamCupcake') {
                    this.visibleCards.clear();
                }
                break;
        }
    }

    /**
     * Load gallery content (placeholder for future implementation)
     */
    loadGallery() {
        // This can be extended to load images dynamically
        console.log('Loading gallery content...');
    }

    /**
     * Load menu content (placeholder for future implementation)
     */
    loadMenu() {
        // This can be extended to load menu items dynamically
        console.log('Loading menu content...');
    }

    /**
     * Load saved API key from localStorage into the settings input
     */
    loadSavedApiKey() {
        if (!this.apiKeyInput) return;
        const savedKey = localStorage.getItem(this.apiKeyStorageKey) || '';
        this.apiKeyInput.value = savedKey;
        if (savedKey) {
            this.updateSettingsStatus('API key loaded from local storage.');
        } else {
            this.updateSettingsStatus('');
        }
    }

    /**
     * Persist the API key to localStorage
     */
    saveApiKey() {
        if (!this.apiKeyInput) return;
        const value = this.apiKeyInput.value.trim();
        localStorage.setItem(this.apiKeyStorageKey, value);
        this.updateSettingsStatus(value ? 'API key saved!' : 'API key cleared.');
    }

    /**
     * Update the status text for settings actions
     * @param {string} message
     */
    updateSettingsStatus(message) {
        if (!this.settingsStatus) return;
        this.settingsStatus.textContent = message;
    }

    /**
     * Update the competition status text
     * @param {string} message
     */
    updateCompetitionStatus(message) {
        if (!this.competitionStatus) return;
        this.competitionStatus.textContent = message;
    }

    /**
     * Render competition data into the grid
     * @param {object} data
     */
    renderCompetitionData(data) {
        if (!this.competitionData) return;
        this.competitionData.innerHTML = '';

        if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
            this.competitionData.innerHTML = '<p>No competition data found.</p>';
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

            this.competitionData.appendChild(item);
        });
    }

    /**
     * Fetch competition data from the Torn API
     */
    async fetchCompetition() {
        const apiKey = localStorage.getItem(this.apiKeyStorageKey);

        if (!apiKey) {
            this.updateCompetitionStatus('Please add your API key in Settings first.');
            return;
        }

        this.updateCompetitionStatus('Fetching competition data...');
        if (this.competitionData) {
            this.competitionData.innerHTML = '';
        }

        const endpoint = `https://api.torn.com/v2/user/competition?key=${encodeURIComponent(apiKey)}`;

        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
            }
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.error || 'API error');
            }

            const competition = data.competition || data;
            this.renderCompetitionData(competition);
            this.updateCompetitionStatus('Competition data loaded.');
        } catch (error) {
            console.error('Competition fetch error:', error);
            this.updateCompetitionStatus(`Error: ${error.message}`);
        }
    }

    /**
     * Get the current active tab ID
     * @returns {string} Active tab ID
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * Get all tabs
     * @returns {Array} Array of tab objects
     */
    getTabs() {
        return this.tabs;
    }

    /**
     * Create animated dancing cupcakes in the background
     */
    createDancingCupcakes() {
        const background = document.getElementById('cupcakesBackground');
        if (!background) return;

        const cupcakeEmoji = '🧁';
        const animationTypes = ['dance1', 'dance2', 'dance3', 'float', 'bounce', 'spin'];
        const numCupcakes = 15;

        for (let i = 0; i < numCupcakes; i++) {
            const cupcake = document.createElement('div');
            cupcake.className = 'cupcake';
            cupcake.textContent = cupcakeEmoji;
            
            // Random animation type
            const animationType = animationTypes[Math.floor(Math.random() * animationTypes.length)];
            cupcake.classList.add(animationType);
            
            // Random position
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            
            // Store base position and current position for physics
            const cupcakeData = {
                element: cupcake,
                baseLeft: left,
                baseTop: top,
                currentLeft: left,
                currentTop: top,
                velocityX: 0,
                velocityY: 0,
                size: 2 + Math.random() * 2,
                mass: 0.5 + Math.random() * 0.5, // Mass affects how much they're pushed
                repulsion: Math.random() > 0.5 // Some push away, some pull toward
            };
            
            cupcake.style.left = `${left}%`;
            cupcake.style.top = `${top}%`;
            
            // Random delay for variety
            cupcake.style.animationDelay = `${Math.random() * 2}s`;
            
            // Size variation
            cupcake.style.fontSize = `${cupcakeData.size}rem`;
            
            // Initialize CSS custom properties for physics
            cupcake.style.setProperty('--physics-x', '0px');
            cupcake.style.setProperty('--physics-y', '0px');
            
            this.cupcakes.push(cupcakeData);
            background.appendChild(cupcake);
        }

        // Start physics animation loop
        this.startPhysicsLoop();
    }

    /**
     * Start the physics animation loop
     */
    startPhysicsLoop() {
        const animate = () => {
            this.updateCupcakePhysics();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Update cupcake positions based on physics and mouse interaction
     */
    updateCupcakePhysics() {
        const forceRadius = 200; // Distance at which force affects cupcakes
        const maxForce = 0.8; // Maximum force strength
        const damping = 0.85; // Friction/damping
        const springStrength = 0.05; // How strongly they return to base position

        this.cupcakes.forEach(cupcake => {
            const rect = cupcake.element.getBoundingClientRect();
            const cupcakeCenterX = rect.left + rect.width / 2;
            const cupcakeCenterY = rect.top + rect.height / 2;

            // Calculate distance from mouse to cupcake
            const dx = this.mouseX - cupcakeCenterX;
            const dy = this.mouseY - cupcakeCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Apply force based on distance
            if (distance < forceRadius && distance > 0) {
                const forceStrength = (1 - distance / forceRadius) * maxForce;
                const angle = Math.atan2(dy, dx);

                // Some cupcakes are repelled, some are attracted
                const forceMultiplier = cupcake.repulsion ? -1 : 1;
                
                // Apply force (inverse square law for more realistic physics)
                const forceX = Math.cos(angle) * forceStrength * forceMultiplier / cupcake.mass;
                const forceY = Math.sin(angle) * forceStrength * forceMultiplier / cupcake.mass;

                cupcake.velocityX += forceX;
                cupcake.velocityY += forceY;
            }

            // Spring force to return to base position
            const baseX = (cupcake.baseLeft / 100) * window.innerWidth;
            const baseY = (cupcake.baseTop / 100) * window.innerHeight;
            const springX = (baseX - cupcakeCenterX) * springStrength;
            const springY = (baseY - cupcakeCenterY) * springStrength;

            cupcake.velocityX += springX;
            cupcake.velocityY += springY;

            // Apply damping
            cupcake.velocityX *= damping;
            cupcake.velocityY *= damping;

            // Update position
            cupcake.currentLeft += cupcake.velocityX / window.innerWidth * 100;
            cupcake.currentTop += cupcake.velocityY / window.innerHeight * 100;

            // Clamp to keep within bounds
            cupcake.currentLeft = Math.max(-5, Math.min(105, cupcake.currentLeft));
            cupcake.currentTop = Math.max(-5, Math.min(105, cupcake.currentTop));

            // Apply physics offset using CSS custom properties
            const offsetX = (cupcake.currentLeft - cupcake.baseLeft) * window.innerWidth / 100;
            const offsetY = (cupcake.currentTop - cupcake.baseTop) * window.innerHeight / 100;
            
            cupcake.element.style.setProperty('--physics-x', `${offsetX}px`);
            cupcake.element.style.setProperty('--physics-y', `${offsetY}px`);
        });
    }

    /**
     * Update cupcake base positions on window resize
     */
    updateCupcakePositions() {
        // Recalculate positions based on new window size
        // This ensures cupcakes maintain their relative positions
        this.cupcakes.forEach(cupcake => {
            cupcake.currentLeft = cupcake.baseLeft;
            cupcake.currentTop = cupcake.baseTop;
            cupcake.velocityX = 0;
            cupcake.velocityY = 0;
        });
    }

    /**
     * Upload team members from JSON file to Firebase
     */
    async uploadTeamMembers() {
        if (!window.firebaseDb) {
            this.updateTeamStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        const uploadButton = document.getElementById('uploadTeamButton');
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.textContent = 'Uploading...';
        }

        // Get selected team
        const teamSelect = document.getElementById('teamSelect');
        const selectedTeam = teamSelect ? teamSelect.value : '';
        
        if (!selectedTeam) {
            this.updateTeamStatus('Please select a team first.');
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload Team Members to Firebase';
            }
            return;
        }

        const fileInput = document.getElementById('teamMembersFileInput');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            this.updateTeamStatus('Please select a JSON file first.');
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload Team Members to Firebase';
            }
            return;
        }

        const file = fileInput.files[0];
        if (!file.name.endsWith('.json')) {
            this.updateTeamStatus('Please select a valid JSON file.');
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload Team Members to Firebase';
            }
            return;
        }

        this.updateTeamStatus('Loading team members JSON file...');

        try {
            // Read the file
            const fileText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Failed to read file'));
                reader.readAsText(file);
            });

            const teamMembers = JSON.parse(fileText);

            if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
                throw new Error('Team members data is empty or invalid');
            }

            this.updateTeamStatus(`Uploading ${teamMembers.length} team members to Firebase...`);

            // Use Firestore functions from window
            const { doc, setDoc } = window.firebaseFirestore;
            
            if (!doc || !setDoc) {
                throw new Error('Firestore functions not available');
            }
            
            let uploaded = 0;
            let errors = 0;

            // Upload in batches to avoid overwhelming Firebase
            const batchSize = 50;
            for (let i = 0; i < teamMembers.length; i += batchSize) {
                const batch = teamMembers.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (member) => {
                    try {
                        // Use userID as document ID for easier querying
                        const memberDoc = doc(window.firebaseDb, 'teamMembers', member.userID.toString());
                        await setDoc(memberDoc, {
                            userID: member.userID,
                            playername: member.playername || '',
                            honorID: member.honorID || null,
                            honorStyle: member.honorStyle || 'default',
                            level: member.level || 0,
                            attacks: member.attacks || 0,
                            status: member.status || [],
                            icons: member.icons || '',
                            attack_link: member.attack_link || '',
                            team: selectedTeam, // Add the selected team
                            uploadedAt: new Date().toISOString()
                        });
                        uploaded++;
                    } catch (error) {
                        console.error(`Error uploading member ${member.userID}:`, error);
                        errors++;
                    }
                }));

                // Update progress
                this.updateTeamStatus(`Uploading... ${uploaded}/${teamMembers.length} members uploaded`);
            }

            this.updateTeamStatus(`Successfully uploaded ${uploaded} team members${errors > 0 ? ` (${errors} errors)` : ''}!`);
            
            // Reload team members to display them in upload tab (optional)
            // Users can check the Team Cupcake tab to see all members

        } catch (error) {
            console.error('Error uploading team members:', error);
            this.updateTeamStatus(`Error: ${error.message}`);
        } finally {
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Upload Team Members to Firebase';
            }
        }
    }

    /**
     * Load team members from Firebase and display them
     */
    async loadTeamMembers() {
        if (!window.firebaseDb) {
            this.updateTeamStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        this.updateTeamStatus('Loading team members from Firebase...');
        if (this.teamMembersGrid) {
            this.teamMembersGrid.innerHTML = '';
        }

        try {
            // Use Firestore functions from window
            const { collection, getDocs, query, orderBy } = window.firebaseFirestore;
            
            if (!collection || !getDocs || !query || !orderBy) {
                throw new Error('Firestore functions not available');
            }
            
            const teamMembersRef = collection(window.firebaseDb, 'teamMembers');
            const q = query(teamMembersRef, orderBy('level', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                this.updateTeamStatus('No team members found in Firebase. Click "Upload Team Members to Firebase" to upload them.');
                return;
            }

            const members = [];
            querySnapshot.forEach((doc) => {
                members.push(doc.data());
            });

            this.renderTeamMembers(members);
            this.updateTeamStatus(`Loaded ${members.length} team members from Firebase.`);

        } catch (error) {
            console.error('Error loading team members:', error);
            this.updateTeamStatus(`Error: ${error.message}`);
        }
    }

    /**
     * Render team members in the grid
     * @param {Array} members - Array of team member objects
     */
    renderTeamMembers(members) {
        if (!this.teamMembersGrid) return;
        this.teamMembersGrid.innerHTML = '';

        members.forEach(member => {
            const item = document.createElement('div');
            item.className = 'competition-item';

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

            const idP = document.createElement('p');
            idP.innerHTML = `<strong>User ID:</strong> ${member.userID}`;
            idP.style.fontSize = '0.9rem';
            idP.style.color = '#777';
            item.appendChild(idP);

            this.teamMembersGrid.appendChild(item);
        });
    }

    /**
     * Update the team status text
     * @param {string} message
     */
    updateTeamStatus(message) {
        if (!this.teamStatus) return;
        this.teamStatus.textContent = message;
    }

    /**
     * Initialize team overview with scroll listener
     */
    initTeamOverview() {
        // Reset state
        this.loadingMoreMembers = false;
        this.lastMemberDoc = null;
        this.hasMoreMembers = true;
        this.loadedMembersCount = 0;

        // Clear grid
        if (this.teamOverviewGrid) {
            this.teamOverviewGrid.innerHTML = '';
        }

        // Remove existing scroll listener if any
        if (this.teamOverviewScrollHandler) {
            if (this.teamOverviewContainer) {
                this.teamOverviewContainer.removeEventListener('scroll', this.teamOverviewScrollHandler);
            }
        }

        // Clean up existing observer
        if (this.cardObserver) {
            this.cardObserver.disconnect();
        }

        // Add scroll listener for infinite scroll
        if (this.teamOverviewContainer) {
            this.teamOverviewScrollHandler = () => {
                this.handleTeamOverviewScroll();
            };
            this.teamOverviewContainer.addEventListener('scroll', this.teamOverviewScrollHandler);
        }

        // Set up Intersection Observer for visible cards
        this.setupCardObserver();

        // Start periodic updates for visible cards
        this.startPeriodicUpdates();

        // Load initial batch
        this.loadTeamOverviewBatch();
    }

    /**
     * Handle scroll event for infinite loading
     */
    handleTeamOverviewScroll() {
        if (!this.teamOverviewContainer || this.loadingMoreMembers || !this.hasMoreMembers) {
            return;
        }

        const container = this.teamOverviewContainer;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        // Load more when user is within 200px of bottom
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            this.loadTeamOverviewBatch();
        }
    }

    /**
     * Load a batch of team members from Firebase (virtualized)
     */
    async loadTeamOverviewBatch() {
        if (!window.firebaseDb) {
            this.updateTeamOverviewStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        if (this.loadingMoreMembers || !this.hasMoreMembers) {
            return;
        }

        this.loadingMoreMembers = true;
        
        // Show loader if not first batch
        const loader = document.getElementById('teamOverviewLoader');
        if (loader && this.loadedMembersCount > 0) {
            loader.style.display = 'block';
        }

        if (this.loadedMembersCount === 0) {
            this.updateTeamOverviewStatus('Loading team members from Firebase...');
        }

        try {
            // Use Firestore functions from window
            const { collection, getDocs, query, orderBy, limit, startAfter } = window.firebaseFirestore;
            
            if (!collection || !getDocs || !query || !orderBy || !limit) {
                throw new Error('Firestore functions not available');
            }
            
            const batchSize = 50; // Load 50 members per batch
            const teamMembersRef = collection(window.firebaseDb, 'teamMembers');
            
            let q;
            if (this.lastMemberDoc) {
                // Load next batch starting after last document
                q = query(
                    teamMembersRef, 
                    orderBy('level', 'desc'),
                    startAfter(this.lastMemberDoc),
                    limit(batchSize)
                );
            } else {
                // Load first batch
                q = query(
                    teamMembersRef, 
                    orderBy('level', 'desc'),
                    limit(batchSize)
                );
            }

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                if (this.loadedMembersCount === 0) {
                    this.updateTeamOverviewStatus('No team members found in Firebase. Go to "Upload Members" tab to upload them.');
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

            // Check if we have fewer results than batch size (means we're at the end)
            if (members.length < batchSize) {
                this.hasMoreMembers = false;
            }

            this.lastMemberDoc = lastDoc;
            this.loadedMembersCount += members.length;

            // Append members to grid
            this.appendTeamMembers(members);
            
            // Update status
            if (!this.hasMoreMembers) {
                this.updateTeamOverviewStatus(`Loaded all ${this.loadedMembersCount} team members.`);
            } else {
                this.updateTeamOverviewStatus(`Loaded ${this.loadedMembersCount} team members. Scroll for more...`);
            }

        } catch (error) {
            console.error('Error loading team overview batch:', error);
            this.updateTeamOverviewStatus(`Error: ${error.message}`);
        } finally {
            this.loadingMoreMembers = false;
            if (loader) {
                loader.style.display = 'none';
            }
        }
    }

    /**
     * Append team members to the grid (for virtualized loading)
     * @param {Array} members - Array of team member objects to append
     */
    appendTeamMembers(members) {
        if (!this.teamOverviewGrid) return;

        members.forEach(member => {
            const item = this.createTeamMemberItem(member);
            // data-user-id is already set in createTeamMemberItem
            this.teamOverviewGrid.appendChild(item);
            
            // Observe this card for visibility - Intersection Observer will handle triggering API calls
            if (this.cardObserver) {
                this.cardObserver.observe(item);
            }
        });
    }

    /**
     * Create a team member item element
     * @param {Object} member - Team member object
     * @returns {HTMLElement} Team member item element
     */
    createTeamMemberItem(member) {
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

        // Competition data container (will be populated by API)
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

    /**
     * Setup Intersection Observer to track visible cards
     */
    setupCardObserver() {
        if (!this.teamOverviewContainer) return;

        // Clean up existing observer
        if (this.cardObserver) {
            this.cardObserver.disconnect();
        }

        this.cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const card = entry.target;
                const userId = card.getAttribute('data-user-id');
                
                if (!userId) return;

                if (entry.isIntersecting) {
                    // Card is visible, add to visible set
                    this.visibleCards.set(userId, card);
                    this.scheduleCompetitionUpdate(userId);
                } else {
                    // Card is not visible, remove from visible set and queue
                    this.visibleCards.delete(userId);
                    // Remove from queue if present
                    this.apiCallQueue = this.apiCallQueue.filter(item => item.userId !== userId);
                }
            });
        }, {
            root: this.teamOverviewContainer,
            rootMargin: '0px', // Only load when actually in viewport
            threshold: 0.01 // Trigger when even 1% is visible
        });
    }

    /**
     * Schedule competition data update for a user
     * @param {string} userId - User ID to fetch competition data for
     */
    scheduleCompetitionUpdate(userId) {
        // Verify card is actually in viewport before scheduling
        const card = this.visibleCards.get(userId);
        if (!card || !this.isCardInViewport(card)) {
            return; // Don't schedule if card is not visible
        }

        // Check if API key is available
        const apiKey = localStorage.getItem(this.apiKeyStorageKey);
        if (!apiKey) {
            // Show message on card if no API key
            if (card) {
                const container = card.querySelector('.competition-data-container');
                if (container) {
                    container.innerHTML = '<p style="font-size: 0.9rem; color: #999;">API key required. Add it in Settings.</p>';
                }
            }
            return;
        }

        // Check cache first
        const cached = this.competitionDataCache.get(userId);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            // Use cached data only if card is still in viewport
            if (this.isCardInViewport(card)) {
                this.updateCardCompetitionData(userId, cached.data);
            }
            return;
        }

        // Check if already in queue
        if (this.apiCallQueue.find(item => item.userId === userId)) {
            return;
        }

        // Add to queue only if card is still visible
        if (this.isCardInViewport(card)) {
            this.apiCallQueue.push({
                userId: userId,
                priority: 1
            });
        }
    }

    /**
     * Start API call processor with rate limiting
     */
    startApiCallProcessor() {
        if (this.apiCallInterval) {
            clearInterval(this.apiCallInterval);
        }

        this.apiCallInterval = setInterval(() => {
            this.processApiCallQueue();
        }, this.apiCallRate);
    }

    /**
     * Process the API call queue (one call at a time)
     */
    async processApiCallQueue() {
        if (this.apiCallQueue.length === 0) return;

        const apiKey = localStorage.getItem(this.apiKeyStorageKey);
        if (!apiKey) {
            // Clear queue if no API key
            this.apiCallQueue = [];
            return;
        }

        // Get next item from queue
        const item = this.apiCallQueue.shift();
        const { userId } = item;

        // Double-check if card is still visible before making API call
        if (!this.visibleCards.has(userId)) {
            return; // Skip if card is no longer visible
        }

        // Verify card is actually in viewport
        const card = this.visibleCards.get(userId);
        if (!card || !this.isCardInViewport(card)) {
            this.visibleCards.delete(userId);
            return; // Skip if card is not actually visible
        }

        try {
            const competitionData = await this.fetchUserCompetition(userId, apiKey);
            
            // Cache the data
            this.competitionDataCache.set(userId, {
                data: competitionData,
                timestamp: Date.now()
            });

            // Update the card if still visible and in viewport
            if (this.visibleCards.has(userId) && this.isCardInViewport(card)) {
                this.updateCardCompetitionData(userId, competitionData);
            }
        } catch (error) {
            console.error(`Error fetching competition data for user ${userId}:`, error);
            // Update card with error message only if still visible
            if (this.visibleCards.has(userId) && this.isCardInViewport(card)) {
                this.updateCardCompetitionData(userId, null, error.message);
            }
        }
    }

    /**
     * Check if a card is actually in the viewport
     * @param {HTMLElement} card - Card element to check
     * @returns {boolean} True if card is in viewport
     */
    isCardInViewport(card) {
        if (!card || !this.teamOverviewContainer) return false;

        const cardRect = card.getBoundingClientRect();
        const containerRect = this.teamOverviewContainer.getBoundingClientRect();

        // Check if card intersects with container viewport
        return (
            cardRect.top < containerRect.bottom &&
            cardRect.bottom > containerRect.top &&
            cardRect.left < containerRect.right &&
            cardRect.right > containerRect.left
        );
    }

    /**
     * Fetch competition data for a user from Torn API
     * @param {string} userId - User ID
     * @param {string} apiKey - Torn API key
     * @returns {Promise<Object>} Competition data
     */
    async fetchUserCompetition(userId, apiKey) {
        const endpoint = `https://api.torn.com/user/${userId}/competition?key=${encodeURIComponent(apiKey)}`;
        
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

    /**
     * Update card with competition data
     * @param {string} userId - User ID
     * @param {Object|null} competitionData - Competition data or null if error
     * @param {string} errorMessage - Error message if any
     */
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

        // Render competition data
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

    /**
     * Start periodic updates for visible cards
     */
    startPeriodicUpdates() {
        // Update visible cards every 30 seconds
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            // Only refresh cards that are actually in viewport
            const cardsToUpdate = [];
            this.visibleCards.forEach((card, userId) => {
                if (this.isCardInViewport(card)) {
                    cardsToUpdate.push(userId);
                } else {
                    // Remove from visible set if no longer in viewport
                    this.visibleCards.delete(userId);
                    // Remove from queue
                    this.apiCallQueue = this.apiCallQueue.filter(item => item.userId !== userId);
                }
            });

            // Schedule updates only for cards actually in viewport
            cardsToUpdate.forEach(userId => {
                this.scheduleCompetitionUpdate(userId);
            });
        }, 30000); // 30 seconds
    }

    /**
     * Update the team overview status text
     * @param {string} message
     */
    updateTeamOverviewStatus(message) {
        if (!this.teamOverviewStatus) return;
        this.teamOverviewStatus.textContent = message;
    }

    /**
     * Delete all team members from Firebase database
     */
    async deleteAllDatabaseData() {
        if (!window.firebaseDb) {
            this.updateDeleteStatus('Firebase is not initialized. Please refresh the page.');
            return;
        }

        // Double confirmation for safety
        const confirm1 = confirm('⚠️ WARNING: This will permanently delete ALL team members from the database.\n\nThis action cannot be undone!\n\nAre you sure you want to continue?');
        if (!confirm1) {
            this.updateDeleteStatus('Delete operation cancelled.');
            return;
        }

        const confirm2 = confirm('⚠️ FINAL CONFIRMATION:\n\nAre you absolutely sure you want to delete ALL database data?\n\nClick OK to proceed or Cancel to abort.');
        if (!confirm2) {
            this.updateDeleteStatus('Delete operation cancelled.');
            return;
        }

        const deleteButton = document.getElementById('deleteAllDataButton');
        if (deleteButton) {
            deleteButton.disabled = true;
            deleteButton.textContent = 'Deleting...';
        }

        this.updateDeleteStatus('Deleting all team members from Firebase...');

        try {
            // Use Firestore functions from window
            const { collection, getDocs, doc, deleteDoc } = window.firebaseFirestore;
            
            if (!collection || !getDocs || !doc || !deleteDoc) {
                throw new Error('Firestore functions not available');
            }
            
            const teamMembersRef = collection(window.firebaseDb, 'teamMembers');
            const querySnapshot = await getDocs(teamMembersRef);

            if (querySnapshot.empty) {
                this.updateDeleteStatus('No data found in database.');
                if (deleteButton) {
                    deleteButton.disabled = false;
                    deleteButton.textContent = 'Delete All Database Data';
                }
                return;
            }

            let deleted = 0;
            let errors = 0;

            // Delete in batches
            const batchSize = 50;
            const docs = [];
            querySnapshot.forEach((docSnapshot) => {
                docs.push(docSnapshot);
            });

            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = docs.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (docSnapshot) => {
                    try {
                        const memberDoc = doc(window.firebaseDb, 'teamMembers', docSnapshot.id);
                        await deleteDoc(memberDoc);
                        deleted++;
                    } catch (error) {
                        console.error(`Error deleting member ${docSnapshot.id}:`, error);
                        errors++;
                    }
                }));

                // Update progress
                this.updateDeleteStatus(`Deleting... ${deleted}/${docs.length} members deleted`);
            }

            this.updateDeleteStatus(`Successfully deleted ${deleted} team members${errors > 0 ? ` (${errors} errors)` : ''}!`);
            
            // Clear the overview grid if we're on that tab
            if (this.teamOverviewGrid) {
                this.teamOverviewGrid.innerHTML = '';
            }
            if (this.teamMembersGrid) {
                this.teamMembersGrid.innerHTML = '';
            }

        } catch (error) {
            console.error('Error deleting database data:', error);
            this.updateDeleteStatus(`Error: ${error.message}`);
        } finally {
            if (deleteButton) {
                deleteButton.disabled = false;
                deleteButton.textContent = 'Delete All Database Data';
            }
        }
    }

    /**
     * Update the delete status text
     * @param {string} message
     */
    updateDeleteStatus(message) {
        if (!this.deleteStatus) return;
        this.deleteStatus.textContent = message;
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cupcakesApp = new CupcakesApp();
});

