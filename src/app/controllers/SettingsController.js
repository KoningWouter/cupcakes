export default class SettingsController {
    constructor({ apiKeyInput, saveButton, statusEl, storageKey, additionalInput, addButton, tableBody, poolStorageKey, onKeysChanged }) {
        this.apiKeyInput = apiKeyInput;
        this.saveButton = saveButton;
        this.statusEl = statusEl;
        this.storageKey = storageKey;
        this.additionalInput = additionalInput;
        this.addButton = addButton;
        this.tableBody = tableBody;
        this.poolStorageKey = poolStorageKey;
        this.onKeysChanged = onKeysChanged;
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

        if (this.addButton && this.additionalInput) {
            this.addButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.addAdditionalKey();
            });
        }
    }

    loadSavedApiKey() {
        if (this.apiKeyInput) {
            const savedKey = localStorage.getItem(this.storageKey) || '';
            this.apiKeyInput.value = savedKey;
            this.updateStatus(savedKey ? 'API key loaded from local storage.' : '');
        }
        this.renderAdditionalKeys();
        this.emitKeysChanged();
    }

    saveApiKey() {
        if (!this.apiKeyInput) return;
        const value = this.apiKeyInput.value.trim();
        localStorage.setItem(this.storageKey, value);
        this.updateStatus(value ? 'API key saved!' : 'API key cleared.');
        this.emitKeysChanged();
    }

    addAdditionalKey() {
        const value = this.additionalInput?.value?.trim();
        if (!value) return;
        const keys = this.getAdditionalKeys();
        keys.push(value);
        localStorage.setItem(this.poolStorageKey, JSON.stringify(keys));
        this.additionalInput.value = '';
        this.renderAdditionalKeys();
        this.emitKeysChanged();
    }

    removeAdditionalKey(index) {
        const keys = this.getAdditionalKeys();
        keys.splice(index, 1);
        localStorage.setItem(this.poolStorageKey, JSON.stringify(keys));
        this.renderAdditionalKeys();
        this.emitKeysChanged();
    }

    getAdditionalKeys() {
        const stored = localStorage.getItem(this.poolStorageKey);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    renderAdditionalKeys() {
        if (!this.tableBody) return;
        const keys = this.getAdditionalKeys();
        this.tableBody.innerHTML = '';
        if (keys.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2;
            cell.textContent = 'No additional API keys added.';
            cell.style.padding = '0.5rem';
            row.appendChild(cell);
            this.tableBody.appendChild(row);
            return;
        }

        keys.forEach((key, idx) => {
            const row = document.createElement('tr');

            const keyCell = document.createElement('td');
            keyCell.style.padding = '0.5rem';
            keyCell.style.fontFamily = 'monospace';
            keyCell.textContent = key;

            const actionCell = document.createElement('td');
            actionCell.style.padding = '0.5rem';
            actionCell.style.textAlign = 'right';
            const btn = document.createElement('button');
            btn.textContent = 'Remove';
            btn.className = 'save-button';
            btn.style.background = '#ff6b6b';
            btn.addEventListener('click', () => this.removeAdditionalKey(idx));
            actionCell.appendChild(btn);

            row.appendChild(keyCell);
            row.appendChild(actionCell);
            this.tableBody.appendChild(row);
        });
    }

    emitKeysChanged() {
        if (!this.onKeysChanged) return;
        const primary = this.apiKeyInput ? this.apiKeyInput.value.trim() : '';
        const extras = this.getAdditionalKeys();
        this.onKeysChanged(primary, extras);
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

