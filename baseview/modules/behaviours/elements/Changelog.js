export default class Changelog {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.boundModels = [];
    }

    onReady(model, view) {
        if (this.api.v1.app.mode.isEditor() && view.getViewport() === 'desktop' && !this.boundModels.includes(model)) {
            this.api.v1.model.bindings.bind(this.rootModel, 'fields.lab_changelog_json', () => {
                this.api.v1.model.redraw(model);
            });
            this.boundModels.push(model);
        }
    }

    onRender(model, view) {
        const contentLanguage = this.rootModel.get('filtered.contentLanguage');
        const changelogEntriesRaw = this.rootModel.get('fields.lab_changelog_json');
        if (changelogEntriesRaw && changelogEntriesRaw.length > 0) {
            let changelog;
            if (typeof changelogEntriesRaw === 'string') {
                changelog = JSON.parse(changelogEntriesRaw);
            } else {
                changelog = [...changelogEntriesRaw];
            }
            model.setFiltered('changelogHasContent', true);
            const newItems = [];
            changelog.forEach((item) => {
                const date = new Date(item.time * 1000);
                const newItem = {
                    time: date.toLocaleDateString(contentLanguage),
                    changelog: this.convertNewLines(item.changelog)
                };
                newItems.push(newItem);
            });
            model.setFiltered('changelog', newItems);
        } else {
            model.setFiltered('changelogHasContent', false);
            model.setFiltered('changelog', []);
        }
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

}
