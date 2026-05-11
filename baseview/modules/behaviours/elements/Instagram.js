export default class Instagram {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
    }

    onViewHelper(model, view) {
        // Extract Instagram post ID for AMP
        const isAMP = this.rootModel.get('filtered.isAMP');
        const instagramUrl = model.get('fields.instagramUrl');

        if (instagramUrl && isAMP) {
            const match = instagramUrl.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
            if (match && match[2]) {
                model.setFiltered('instagramId', match[2]);
            }
        }

        this.scheduleInstagramProcess();
    }

    scheduleInstagramProcess() {
        // Debounce to avoid multiple calls
        clearTimeout(this._instagramTimeout);
        this._instagramTimeout = setTimeout(() => {
            if (window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process) {
                window.instgrm.Embeds.process();
            }
        }, 100);
    }

}
