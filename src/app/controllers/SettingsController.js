export default class SettingsController {
    constructor({ statusEl, additionalInput, addButton, tableBody, poolStorageKey, onKeysChanged }) {
        this.statusEl = statusEl;
        this.additionalInput = additionalInput;
        this.addButton = addButton;
        this.tableBody = tableBody;
        this.poolStorageKey = poolStorageKey;
        this.onKeysChanged = onKeysChanged;
    }

    attach() {
        if (this.addButton && this.additionalInput) {
            this.addButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.addKey();
            });
        }
    }

    loadKeys() {
        this.renderKeys();
        this.emitKeysChanged();
    }

    addKey() {
        const value = this.additionalInput?.value?.trim();
        if (!value) return;
        const keys = this.getKeys();
        keys.push(value);
        localStorage.setItem(this.poolStorageKey, JSON.stringify(keys));
        this.additionalInput.value = '';
        this.renderKeys();
        this.emitKeysChanged();
        this.updateStatus('API key added.');
    }

    removeKey(index) {
        const keys = this.getKeys();
        keys.splice(index, 1);
        localStorage.setItem(this.poolStorageKey, JSON.stringify(keys));
        this.renderKeys();
        this.emitKeysChanged();
        this.updateStatus('API key removed.');
    }

    getKeys() {
        const stored = localStorage.getItem(this.poolStorageKey);
        if (!stored) return [];
        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    renderKeys() {
        if (!this.tableBody) return;
        const keys = this.getKeys();
        this.tableBody.innerHTML = '';
        if (keys.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2;
            cell.textContent = 'No API keys added.';
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
            btn.addEventListener('click', () => this.removeKey(idx));
            actionCell.appendChild(btn);

            row.appendChild(keyCell);
            row.appendChild(actionCell);
            this.tableBody.appendChild(row);
        });
    }

    emitKeysChanged() {
        if (!this.onKeysChanged) return;
        const keys = this.getKeys();
        this.onKeysChanged(keys);
    }

    updateStatus(message) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
    }
}

