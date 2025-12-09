/**
 * Cupcakes Web App
 * Main application controller
 */

class CupcakesApp {
    constructor() {
        this.tabs = [];
        this.activeTab = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupTabs();
        this.attachEventListeners();
        this.loadInitialTab();
    }

    /**
     * Setup tab system
     */
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

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
            default:
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
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cupcakesApp = new CupcakesApp();
});

