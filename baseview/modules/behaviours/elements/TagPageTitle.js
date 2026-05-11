export default class TagPageTitle {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
        this.rootModel = this.api.v1.model.query.getRootModel();
    }

    onRender(model, view) {
        // Only fetch the tag on front-end (not in editor)
        // In editor, the template shows "Tag Title" placeholder
        if (!this.isEditor) {
            let tagTitle = '';

            // Primary method: Extract from hostpath (e.g., /tag/security -> security)
            // On tag pages, the hostpath is set to "{tagPath}/{tagName}" by the PageByAlias controller
            const hostpath = this.rootModel.get('fields.hostpath') || '';

            // Split the path and get the last segment (the tag name)
            const pathSegments = hostpath.split('/').filter(segment => segment.length > 0);
            if (pathSegments.length >= 2) {
                // If path has 2+ segments (e.g., "tag" and "security"), take the last one
                tagTitle = decodeURIComponent(pathSegments[pathSegments.length - 1]);
            }

            // Set the filtered data for the template
            model.setFiltered('tagTitle', tagTitle);
        }
    }
}
