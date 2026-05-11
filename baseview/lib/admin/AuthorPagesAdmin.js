export default class AuthorPagesAdmin {

    constructor(params) {
        this.params = params;
        this.container = null;
        this.enabledIds = [];
        this.enabledBylines = [];
        this.searchResults = [];
        this.hasSearched = false;
        this.textarea = null;
    }

    getListener() {
        return this.onDataModified.bind(this);
    }

    onDataModified() {
        if (!this.container) {
            setTimeout(() => this.createUI(), 200);
        } else {
            this.hideTextarea();
            this.refreshList();
            this.toggleVisibility();
        }
    }

    toggleVisibility() {
        if (!this.container) return;
        const enableForAll = document.querySelector('#input-enableForAll');
        const isAllEnabled = enableForAll && enableForAll.checked;
        this.container.style.display = isAllEnabled ? 'none' : '';
    }

    refreshList() {
        const currentIds = this.parseIds();
        const changed = currentIds.length !== this.enabledIds.length ||
            currentIds.some((id, i) => id !== this.enabledIds[i]);
        if (changed) {
            this.loadEnabledBylines();
        }
    }

    hideTextarea() {
        const editor = document.querySelector('.lab-configobject-editor');
        if (editor) editor.classList.add('author-pages-initialized');
    }

    createUI() {
        const editorContainer = document.querySelector('.view_editor');
        if (!editorContainer || editorContainer.querySelector('.author-pages-picker')) return;

        // Find the textarea (should exist after 200ms delay)
        this.textarea = document.querySelector('[data-path="enabledAuthorIds"] textarea');
        if (!this.textarea) return;

        this.hideTextarea();

        this.container = document.createElement('div');
        this.container.className = 'author-pages-picker lab-configobject-editor';
        this.container.innerHTML = `
            <form class="form_std">
                <div class="lab-items">
                    <h3 class="lab-item-group-title label-heading">Add author</h3>
                    <div class="lab-item lab-item-container" style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="author-pages-search" aria-label="Search bylines" class="author-pages-search-input" placeholder="Search by name...">
                        <button type="button" class="author-pages-search-btn">Search</button>
                    </div>
                    <div class="author-pages-search-results"></div>
                    <h3 class="lab-item-group-title label-heading">Enabled authors</h3>
                    <div class="author-pages-list"></div>
                </div>
            </form>
        `;

        editorContainer.appendChild(this.container);
        this.bindEvents();
        this.loadEnabledBylines();
        this.toggleVisibility();
    }

    bindEvents() {
        const searchInput = this.container.querySelector('.author-pages-search-input');
        const searchBtn = this.container.querySelector('.author-pages-search-btn');

        searchBtn.addEventListener('click', () => this.searchBylines(searchInput.value));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchBylines(searchInput.value);
            }
        });
    }

    parseIds() {
        const value = (this.textarea.value || '').trim();
        if (!value) return [];
        const ids = value.split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));
        return [...new Set(ids)];
    }

    updateTextarea() {
        this.textarea.value = this.enabledIds.join(', ');
        this.textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async loadEnabledBylines() {
        this.enabledIds = this.parseIds();
        if (!this.enabledIds.length) {
            this.renderList();
            return;
        }
        try {
            const response = await fetch(`/ajax/byline/get-by-ids?ids=${this.enabledIds.join(',')}`);
            if (!response.ok) {
                console.warn('[AuthorPagesAdmin] Failed to fetch bylines:', response.status);
            }
            const data = await response.json();
            this.enabledBylines = data.data || data || [];
            this.renderList();
        } catch (err) {
            console.warn('[AuthorPagesAdmin] Error loading bylines:', err);
            this.renderList();
        }
    }

    renderList() {
        const listContainer = this.container.querySelector('.author-pages-list');

        if (!this.enabledIds.length) {
            listContainer.innerHTML = '<p class="lab-item-group-description">No authors enabled. Use the search above to add authors.</p>';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = '<thead><tr><th>Name</th><th>ID</th><th></th></tr></thead>';
        const tbody = document.createElement('tbody');

        this.enabledIds.forEach(id => {
            const byline = this.enabledBylines.find(b => b.id === id || b.instance_of === id);
            const fields = byline ? (byline.fields || {}) : {};
            const name = byline ? (`${fields.firstname || ''} ${fields.lastname || ''}`.trim() || '—') : '—';
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = name;
            const tdId = document.createElement('td');
            tdId.textContent = id;
            const tdAction = document.createElement('td');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Remove';
            btn.addEventListener('click', () => this.removeAuthor(id));
            tdAction.appendChild(btn);
            tr.append(tdName, tdId, tdAction);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        listContainer.innerHTML = '';
        listContainer.appendChild(table);
    }

    removeAuthor(id) {
        this.enabledIds = this.enabledIds.filter(i => i !== id);
        this.enabledBylines = this.enabledBylines.filter(b => b.id !== id && b.instance_of !== id);
        this.updateTextarea();
        this.renderList();
        this.renderSearchResults();
    }

    async searchBylines(query) {
        const trimmed = query.trim();
        if (!trimmed) {
            this.searchResults = [];
            this.hasSearched = false;
            this.container.querySelector('.author-pages-search-results').textContent = '';
            return;
        }

        const parts = trimmed.split(/\s+/);
        const params = new URLSearchParams();
        params.set('firstname', `*${parts[0]}*`);
        if (parts.length > 1) {
            params.set('lastname', `*${parts.slice(1).join(' ')}*`);
        }

        const resultsContainer = this.container.querySelector('.author-pages-search-results');
        resultsContainer.textContent = 'Searching...';

        try {
            const response = await fetch(`/ajax/byline/search?${params}`);
            const data = await response.json();
            this.searchResults = data.data || data || [];
            this.hasSearched = true;
            this.renderSearchResults();
        } catch {
            resultsContainer.textContent = 'Search failed.';
        }
    }

    renderSearchResults() {
        const resultsContainer = this.container.querySelector('.author-pages-search-results');

        if (!this.searchResults.length) {
            resultsContainer.textContent = this.hasSearched ? 'No bylines found.' : '';
            return;
        }

        const table = document.createElement('table');
        table.innerHTML = '<thead><tr><th>Name</th><th>ID</th><th></th></tr></thead>';
        const tbody = document.createElement('tbody');

        this.searchResults.forEach(b => {
            const fields = b.fields || {};
            const name = `${fields.firstname || ''} ${fields.lastname || ''}`.trim() || '—';
            const instanceId = b.instance_of || b.id;
            const alreadyAdded = this.enabledIds.includes(instanceId);
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = name;
            const tdId = document.createElement('td');
            tdId.textContent = instanceId;
            const tdAction = document.createElement('td');
            if (alreadyAdded) {
                const span = document.createElement('span');
                span.textContent = 'Added';
                span.className = 'author-pages-added';
                tdAction.appendChild(span);
            } else {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = 'Add';
                btn.addEventListener('click', () => this.addAuthor(b));
                tdAction.appendChild(btn);
            }
            tr.append(tdName, tdId, tdAction);
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(table);
    }

    addAuthor(byline) {
        const instanceId = byline.instance_of || byline.id;
        if (this.enabledIds.includes(instanceId)) return;
        this.enabledIds.push(instanceId);
        this.enabledBylines.push(byline);
        this.updateTextarea();
        this.renderList();
        this.renderSearchResults();
    }
}
