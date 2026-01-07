export class ArticleChangelog {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.log = params.log;
        this.enabled = true;
        this.labels = {
            btnUpdate: 'Update changelog entry',
            btnAdd: 'Add changelog entry'
        };
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">

            <div class="lab-formgroup lab-grid">
                <h2 class="lab-title lab-grid-large-12">Changelog</h2>
                <form id="changelogForm" class="lab-formgroup-item lab-grid-large-12">
                    <label for="date">Select a date</label>
                    <input type="date" required id="date" name="date" value="">
                    <input type="hidden" id="userId" name="userId" value="${ this.api.v1.user.getUserId() }">
                    <input type="hidden" id="index" name="index" value="">
                    <label for="changelog">Changelog text</label>
                    <textarea name="changelogText" required id="changelogText" style="height: 240px;" placeholder="Changelog text..."></textarea>
                    <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap lab-align-right">
                        <input type="button" id="changelogCancel" value="Clear">
                        <input type="submit" id="changelogSubmit" class="lab-add" value="Add changelog entry">
                    </div>
                </form>
                <h3>Changelog entries</h3>
                <div id="changelogEntries" class="lab-formgroup-item lab-grid-large-12">
                </div>
            </div>            

        </div>`;
    }

    onAside() {
        return {
            section: 'General',
            label: 'Changelog'
        };
    }

    onPaths() {
        return {};
    }

    onMarkup() {
        const changelogEntriesRaw = this.rootModel.get('fields.lab_changelog_json') || [];
        let changelogEntries;
        if (typeof changelogEntriesRaw === 'string') {
            changelogEntries = JSON.parse(changelogEntriesRaw);
        } else {
            changelogEntries = [...changelogEntriesRaw];
        }
        const markup = this.api.v1.util.dom.renderTemplate(this.template, {}, true);

        changelogEntries = this.sortEntries(changelogEntries);
        markup.querySelector('#changelogEntries').innerHTML = this.entriesMarkup(changelogEntries);

        markup.querySelector('#changelogCancel').addEventListener('click', (event) => {
            event.preventDefault();
            markup.querySelector('#changelogSubmit').value = this.labels.btnAdd;
            markup.querySelector('#changelogCancel').value = 'Clear';
            markup.querySelector('#changelogForm').reset();
        });

        this.addChangelogEntryEventListener(markup);
        this.editChangelogEntryEventListener(markup, changelogEntries);
        this.deleteChangelogEntryEventListener(markup);

        return markup;
    }

    addEntryToChangelog(markup) {
        const changelogEntriesRaw = this.rootModel.get('fields.lab_changelog_json') || [];
        let changelogEntries;
        if (typeof changelogEntriesRaw === 'string') {
            changelogEntries = JSON.parse(changelogEntriesRaw);
        } else {
            changelogEntries = [...changelogEntriesRaw];
        }
        markup.querySelector('#changelogEntries').innerHTML = this.entriesMarkup(changelogEntries);
        this.editChangelogEntryEventListener(markup, changelogEntries);
        this.deleteChangelogEntryEventListener(markup);
    }

    /**
     * Generates the markup for displaying entries.
     *
     * @param {Array} entries - The array of entries.
     * @returns {string} - The generated markup.
     */
    entriesMarkup(entries) {
        return entries.map((entry, index) => `
            <div class="lab-formgroup-item lab-grid-large-12" data-index="${ index }" data-user-id="${ entry.userId }" style="border: 1px solid rgb(214, 214, 214); padding: 0.5rem;">
                <p class="entry-date" style="font-weight:bold; margin: 0;">${ this.formatTimestampToDate(entry.time * 1000) }</p>
                <div clasee="entry-text" style="margin: 0;">${ this.convertNewLines(entry.changelog) }</div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap lab-align-right">
                    <button class="lab-btn edit-button" data-index="${ index }">Edit</button>
                    <button class="lab-btn delete-button" data-index="${ index }">Delete</button>
                </div>
            </div>`).join('');
    }

    /**
     * Converts newline characters in a given text to HTML paragraph and line break tags.
     *
     * - Double newlines (`\n\n`) are replaced with `</p><p>`.
     * - Single newlines (`\n`) are replaced with `<br>`.
     * - The entire text is wrapped in `<p>` tags.
     *
     * @param {string} text - The input text containing newline characters.
     * @returns {string} - The converted text with HTML tags.
     */
    convertNewLines(text) {
        text = text.replace(/\n\n/g, '</p><p>');
        text = text.replace(/\n/g, '<br>');
        text = `<p>${ text }</p>`;
        return text;
    }

    /**
     * Handles the submission of an article change log.
     *
     * @param {HTMLElement} markup - The markup containing the form elements.
     * @returns {Object} - An object containing the user ID, time, and changelog.
     */
    handleSubmit(markup) {
        const time = parseInt(markup.querySelector('#date').valueAsNumber / 1000, 10);
        const userId = parseInt(markup.querySelector('#userId').value, 10);
        const changelog = markup.querySelector('#changelogText').value;

        return {
            userId,
            time,
            changelog
        };
    }

    /**
     * Updates the changelog entry in the markup.
     *
     * @param {HTMLElement} markup - The markup element containing the changelog entry.
     * @param {number} timestampValue - The timestamp value for the changelog entry.
     * @param {string} userIdValue - The user ID value for the changelog entry.
     * @param {string} changelogTextValue - The changelog text value for the entry.
     * @param {number} index - The index of the changelog entry.
     * @returns {void}
     */
    changeChangelogEntry(markup, timestampValue, userIdValue, changelogTextValue, index) {
        markup.querySelector('#date').value = new Date(timestampValue * 1000).toISOString().split('T')[0] || '';
        markup.querySelector('#userId').value = userIdValue || '';
        markup.querySelector('#changelogText').value = changelogTextValue || '';
        markup.querySelector('#changelogSubmit').value = this.labels.btnUpdate;
        markup.querySelector('#changelogCancel').value = 'Cancel';
        markup.querySelector('#index').value = index;
        markup.querySelector('#changelogText').focus();
    }

    /**
     * Converts a timestamp to a formatted date string.
     *
     * @param {number} timestamp - The timestamp to convert.
     * @returns {string} The formatted date string.
     */
    formatTimestampToDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    }

    /**
     * Returns the highest update date from the given entries.
     *
     * @param {Array<Object>} entries - The array of entries.
     * @returns {number} The highest update date.
     */
    getHighestUpdateDate(entries) {
        return entries.reduce((prev, current) => ((prev.time > current.time) ? prev : current)).time;
    }

    /**
     * Sorts the given entries in descending order based on their time property.
     *
     * @param {Array} entries - The array of entries to be sorted.
     * @returns {Array} - The sorted array of entries.
     */
    sortEntries(entries) {
        return entries.slice().sort((a, b) => b.time - a.time);
    }

    /**
     * Adds an event listener to the changelog form for submitting a changelog entry.
     *
     * @param {HTMLElement} markup - The markup element containing the changelog form.
     */
    addChangelogEntryEventListener(markup) {
        markup.querySelector('#changelogForm').addEventListener('submit', (event) => {
            const changelogEntriesRaw = this.rootModel.get('fields.lab_changelog_json') || [];
            let changelogEntries;
            if (typeof changelogEntriesRaw === 'string') {
                changelogEntries = JSON.parse(changelogEntriesRaw);
            } else {
                changelogEntries = [...changelogEntriesRaw];
            }
            event.preventDefault();
            const changelog = markup.querySelector('#changelogSubmit').value === this.labels.btnAdd ? 'add' : 'update';
            if (markup.querySelector('#index').value !== '') {
                const index = parseInt(markup.querySelector('#index').value, 10);
                changelogEntries[index] = this.handleSubmit(markup);
                changelogEntries = this.sortEntries(changelogEntries);
            } else {
                changelogEntries.unshift(this.handleSubmit(markup));
                changelogEntries = this.sortEntries(changelogEntries);
            }
            markup.querySelector('#changelogSubmit').value = this.labels.btnAdd;
            markup.querySelector('#changelogCancel').value = 'Clear';
            this.rootModel.set('fields.lab_changelog_json', changelogEntries);
            this.rootModel.set('fields.lab_changelogUpdate_date', this.getHighestUpdateDate(changelogEntries));
            this.addEntryToChangelog(markup);
            event.target.reset();

            this.log({
                type: 'data',
                app: this.constructor.name,
                path: 'fields.lab_changelog_json',
                changelog
            });
        });
    }

    /**
     * Adds event listeners to the edit buttons in the markup.
     *
     * @param {Element} markup - The markup element containing the edit buttons.
     * @param {Array} changelogEntries - An array of changelog entries.
     * @returns {void}
     */
    editChangelogEntryEventListener(markup, changelogEntries) {
        markup.querySelectorAll('.edit-button').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const index = event.target.getAttribute('data-index');
                const entry = changelogEntries[index];
                this.changeChangelogEntry(markup, entry.time, entry.userId, entry.changelog, index);
            });
        });
    }

    /**
     * Attaches event listeners to delete buttons within the given markup element.
     * When a delete button is clicked, the corresponding changelog entry is removed from the changelogEntries array.
     * The updated changelogEntries array is then serialized and stored in the 'fields.lab_changelog_json' property of the rootModel.
     * The markup is updated to reflect the changes, and the event listeners for editing and deleting changelog entries are reattached.
     *
     * @param {Element} markup - The markup element containing the delete buttons.
     * @param {Array} changelogEntries - The array of changelog entries.
     */
    deleteChangelogEntryEventListener(markup) {
        markup.querySelectorAll('.delete-button').forEach((button) => {
            button.addEventListener('click', (event) => {
                const changelogEntriesRaw = this.rootModel.get('fields.lab_changelog_json') || [];
                let changelogEntries;
                if (typeof changelogEntriesRaw === 'string') {
                    changelogEntries = JSON.parse(changelogEntriesRaw);
                } else {
                    changelogEntries = [...changelogEntriesRaw];
                }
                event.preventDefault();
                const index = event.target.getAttribute('data-index');
                changelogEntries.splice(index, 1);
                this.rootModel.set('fields.lab_changelog_json', changelogEntries);
                if (changelogEntries.length === 0) {
                    this.rootModel.set('fields.lab_changelogUpdate_date', null);
                } else {
                    this.rootModel.set('fields.lab_changelogUpdate_date', this.getHighestUpdateDate(changelogEntries));
                }
                markup.querySelector('#changelogEntries').innerHTML = this.entriesMarkup(changelogEntries);
                this.editChangelogEntryEventListener(markup, changelogEntries);
                this.deleteChangelogEntryEventListener(markup, changelogEntries);

                this.log({
                    type: 'data',
                    app: this.constructor.name,
                    path: 'fields.lab_changelog_json',
                    changelog: 'delete'
                });
            });
        });
    }

}
