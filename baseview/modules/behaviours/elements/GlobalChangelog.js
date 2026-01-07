export default class GlobalChangelog {

    constructor(api) {
        this.api = api;
    }

    onViewHelper(model, view) {
        const siteID = this.api.v1.site.getSite().id;

        model.setFiltered('siteID', siteID);
    }

    onRender(model, view) {
        const rootModel = this.api.v1.model.query.getRootModel();
        const contentLanguage = rootModel.get('filtered.contentLanguage');
        const external = view.get('external');

        const templateData = [];

        if (external && external.result) {
            external.result.forEach((result) => {
                if (result.type === 'article') {
                    let changelog;
                    const changelogRaw = result.lab_changelog_json || null;
                    if (typeof changelogRaw === 'string') {
                        const changelogStripped = this.stripJSON(changelogRaw);
                        if (changelogStripped) {
                            if (this.isValidJSON(changelogStripped)) {
                                changelog = JSON.parse(changelogStripped);
                            }
                        }
                    } else {
                        changelog = changelogRaw;
                    }
                    if (changelog) {
                        changelog.forEach((item) => {
                            const date = new Date(item.time * 1000);
                            item.time = date.toLocaleDateString(contentLanguage);
                            item.changelog = this.convertNewLines(item.changelog);
                        });
                    }
                    templateData.push({
                        title: result.title,
                        published_url: result.published_url,
                        changelog
                    });
                }
            });
        }
        model.setFiltered('templateData', templateData);
    }

    /**
     * Removes escape characters from a JSON string.
     *
     * @param {string} str - The JSON string to be stripped.
     * @returns {string} - The stripped JSON string.
     */
    stripJSON(str) {
        return str.replace(/\\n/g, '\\n')
            .replace(/\\'/g, '\'')
            .replace(/\\"/g, '"')
            .replace(/\\&/g, '&')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\b/g, '\b')
            .replace(/\\f/g, '\f');
    }

    /**
     * Checks if a given string is a valid JSON.
     *
     * @param {string} str - The string to be checked.
     * @returns {boolean} - Returns true if the string is a valid JSON, otherwise false.
     */
    isValidJSON(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
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
        text = text.replace(/\\n\\n/g, '</p><p>');
        text = text.replace(/\\n/g, '<br>');
        text = `<p>${ text }</p>`;
        return text;
    }

}