import TabController from './controllers/TabController.js';
import SettingsController from './controllers/SettingsController.js';
import CompetitionController from './controllers/CompetitionController.js';
import TeamUploadController from './controllers/TeamUploadController.js';
import TeamOverviewController from './controllers/TeamOverviewController.js';
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
        this.settingsStatus = document.getElementById('settingsStatus');
        this.deleteStatus = document.getElementById('deleteStatus');

        this.competitionStatus = document.getElementById('competitionStatus');
        this.competitionData = document.getElementById('competitionData');

        this.teamStatus = document.getElementById('teamStatus');
        this.teamMembersGrid = document.getElementById('teamMembersGrid');
        this.teamOverviewStatus = document.getElementById('teamOverviewStatus');
        this.teamOverviewGrid = document.getElementById('teamOverviewGrid');
        this.teamOverviewContainer = document.getElementById('teamOverviewContainer');

        // Ensure no legacy single-key form remains
        const legacyForm = document.getElementById('settingsForm');
        if (legacyForm) {
            legacyForm.remove();
        }
    }

    setupControllers() {
        this.tabController = new TabController(this.tabButtons, (tabId) => this.onTabChange(tabId));
        this.settingsController = new SettingsController({
            statusEl: this.settingsStatus,
            additionalInput: document.getElementById('additionalApiKeyInput'),
            addButton: document.getElementById('addApiKeyButton'),
            tableBody: document.getElementById('apiKeysTableBody'),
            poolStorageKey: `${this.apiKeyStorageKey}_pool`,
            onKeysChanged: (keys) => this.competitionService.setKeys(keys)
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
        this.teamOverviewController = new TeamOverviewController({
            container: this.teamOverviewContainer,
            grid: this.teamOverviewGrid,
            statusEl: this.teamOverviewStatus,
            competitionService: this.competitionService
        });
        this.cupcakeAnimator = new CupcakeAnimator();

        this.settingsController.loadKeys();
        // Ensure pool is applied on load
        this.competitionService.setKeys(this.settingsController.getKeys());
        this.cupcakeAnimator.start();
        this.tabController.loadInitialTab();
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
                this.settingsController.loadKeys();
                this.competitionService.setKeys(this.settingsController.getKeys());
                break;
            case 'home':
                this.competitionController.loadCompetition();
                this.teamOverviewController.destroy();
                break;
            case 'teamCupcake':
                this.teamOverviewController.init();
                break;
            default:
                this.teamOverviewController.destroy();
                break;
        }
    }
}

