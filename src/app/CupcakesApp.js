import TabController from './controllers/TabController.js';
import SettingsController from './controllers/SettingsController.js';
import CompetitionController from './controllers/CompetitionController.js';
import TeamUploadController from './controllers/TeamUploadController.js';
import UpdatingController from './controllers/UpdatingController.js';
import CompetitionService from './services/CompetitionService.js';
import CupcakeAnimator from './animations/CupcakeAnimator.js';

/**
 * Team Cupcake Web App
 * Main application orchestrator
 */
export default class CupcakesApp {
    constructor() {
        this.apiKeyStorageKey = 'cupcakes_api_key';
        this.competitionService = new CompetitionService();

        this.cacheDom();
        this.setupControllers();
        this.attachEventListeners();
    }

    cacheDom() {
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.apiSaveButton = document.getElementById('saveApiKeyButton');
        this.settingsStatus = document.getElementById('settingsStatus');
        this.deleteStatus = document.getElementById('deleteStatus');

        this.competitionStatus = document.getElementById('competitionStatus');
        this.competitionData = document.getElementById('competitionData');

        this.teamStatus = document.getElementById('teamStatus');
        this.teamMembersGrid = document.getElementById('teamMembersGrid');
        this.updatingStatus = document.getElementById('updatingStatus');
        this.updatingApiKeyInfo = document.getElementById('updatingApiKeyInfo');
    }

    setupControllers() {
        this.tabController = new TabController(this.tabButtons, (tabId) => this.onTabChange(tabId));
        this.settingsController = new SettingsController({
            apiKeyInput: this.apiKeyInput,
            saveButton: this.apiSaveButton,
            statusEl: this.settingsStatus,
            storageKey: this.apiKeyStorageKey,
            additionalInput: document.getElementById('additionalApiKeyInput'),
            addButton: document.getElementById('addApiKeyButton'),
            tableBody: document.getElementById('apiKeysTableBody'),
            poolStorageKey: `${this.apiKeyStorageKey}_pool`,
            onKeysChanged: (primary, extras) => {
                this.competitionService.updateKeys(primary, extras);
                // Update API key display and restart processor with new rate if updating is running
                if (this.updatingController && this.updatingController.isInitialized) {
                    this.updatingController.updateApiKeyDisplay();
                    this.updatingController.startApiCallProcessor(); // Restart with new interval
                }
            }
        });
        this.competitionController = new CompetitionController({
            statusEl: this.competitionStatus,
            dataEl: this.competitionData,
            competitionService: this.competitionService
        });
        this.teamUploadController = new TeamUploadController({
            teamStatus: this.teamStatus,
            teamMembersGrid: this.teamMembersGrid,
            deleteStatus: this.deleteStatus
        });
        this.updatingController = new UpdatingController({
            statusEl: this.updatingStatus,
            competitionService: this.competitionService,
            apiKeyDisplayEl: this.updatingApiKeyInfo
        });
        this.cupcakeAnimator = new CupcakeAnimator();

        this.settingsController.loadSavedApiKey();
        this.cupcakeAnimator.start();
        this.tabController.loadInitialTab();
        
        // Start updating process automatically when app loads
        // Wait for Firebase to be ready (init() now waits for Firebase internally)
        setTimeout(async () => {
            try {
                await this.updatingController.init();
            } catch (error) {
                console.error('Failed to initialize updating controller:', error);
            }
        }, 500);
    }

    attachEventListeners() {
        document.addEventListener('keydown', (e) => this.tabController.handleKeyboardNavigation(e));
        this.settingsController.attach();

        const uploadTeamButton = document.getElementById('uploadTeamButton');
        if (uploadTeamButton) {
            uploadTeamButton.addEventListener('click', () => this.teamUploadController.uploadTeamMembers());
        }

        const deleteAllDataButton = document.getElementById('deleteAllDataButton');
        if (deleteAllDataButton) {
            deleteAllDataButton.addEventListener('click', () => this.teamUploadController.deleteAllDatabaseData());
        }
    }

    onTabChange(tabId) {
        switch (tabId) {
            case 'settings':
                this.settingsController.loadSavedApiKey();
                break;
            case 'home':
                this.competitionController.loadCompetition();
                // Don't destroy - updating continues in background
                break;
            case 'updating':
                // Updating already runs automatically, just ensure it's initialized
                if (!this.updatingController.isInitialized) {
                    this.updatingController.init();
                }
                break;
            default:
                // Don't destroy - updating continues in background
                break;
        }
    }
}

