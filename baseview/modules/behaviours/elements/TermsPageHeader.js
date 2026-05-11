export default class TermsPageHeader {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
        this.rootModel = this.api.v1.model.query.getRootModel();
    }

    onRender(model, view) {

        if (!this.isEditor) {
            // Access mainterm from rootModel (where page-level data is stored)
            const displayName = this.rootModel.get('mainterm.section.displayName');
            const description = this.rootModel.get('mainterm.section.parameters.description');

            model.setFiltered('displayName', displayName);
            model.setFiltered('description', description);
        }
    }
}
