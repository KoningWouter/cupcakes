export default class TabController {
    constructor(tabButtons, onChange) {
        this.tabs = [];
        this.activeTab = null;
        this.onChange = onChange;
        this.setupTabs(tabButtons);
        this.loadInitialTab();
    }

    setupTabs(tabButtons) {
        tabButtons.forEach((button, index) => {
            const tabId = button.getAttribute('data-tab');
            const panel = document.getElementById(tabId);

            if (panel) {
                button.addEventListener('click', () => this.switchTab(tabId));
                this.tabs.push({ id: tabId, button, panel, index });
            }
        });
    }

    loadInitialTab() {
        const activeTab = this.tabs.find(tab => tab.button.classList.contains('active'));
        if (activeTab) {
            this.activeTab = activeTab.id;
            if (this.onChange) this.onChange(activeTab.id);
        } else if (this.tabs.length > 0) {
            this.switchTab(this.tabs[0].id);
        }
    }

    switchTab(tabId) {
        const targetTab = this.tabs.find(tab => tab.id === tabId);
        if (!targetTab || this.activeTab === tabId) return;

        if (this.activeTab) {
            const currentTab = this.tabs.find(tab => tab.id === this.activeTab);
            if (currentTab) {
                currentTab.button.classList.remove('active');
                currentTab.button.setAttribute('aria-selected', 'false');
                currentTab.panel.classList.remove('active');
            }
        }

        targetTab.button.classList.add('active');
        targetTab.button.setAttribute('aria-selected', 'true');
        targetTab.panel.classList.add('active');
        this.activeTab = tabId;

        if (this.onChange) this.onChange(tabId);
    }

    handleKeyboardNavigation(e) {
        if (!e.ctrlKey && !e.metaKey) return;

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

