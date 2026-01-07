export default class Changelog {

    constructor(api) {
        this.api = api;
    }

    onRender(model, view) {
        const rootModel = this.api.v1.model.query.getRootModel();
        const contentLanguage = rootModel.get('filtered.contentLanguage');
        const changelogEntriesRaw = rootModel.get('fields.lab_changelog_json');
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
