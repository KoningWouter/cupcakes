export default class SettingsController {
    constructor({ apiKeyInput, saveButton, statusEl, storageKey }) {
        this.apiKeyInput = apiKeyInput;
        this.saveButton = saveButton;
        this.statusEl = statusEl;
        this.storageKey = storageKey;
    }

    attach() {
        if (this.saveButton && this.apiKeyInput) {
            this.saveButton.addEventListener('click', (e) => {
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
    }

    loadSavedApiKey() {
        if (!this.apiKeyInput) return;
        const savedKey = localStorage.getItem(this.storageKey) || '';
        this.apiKeyInput.value = savedKey;
        this.updateStatus(savedKey ? 'API key loaded from local storage.' : '');
    }

    saveApiKey() {
        if (!this.apiKeyInput) return;
        const value = this.apiKeyInput.value.trim();
        localStorage.setItem(this.storageKey, value);
        this.updateStatus(value ? 'API key saved!' : 'API key cleared.');
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

