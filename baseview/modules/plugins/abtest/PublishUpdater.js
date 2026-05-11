export class PublishUpdater {

    constructor(api, model) {
        this.api = api;
        this.model = model;
    }

    // (void)
    async willPublish() {

        // 1) Find all collections used on this page (via Elasticsearch)
        const collectionIds = await this.getCollections();

        // 2) Merge with any collection IDs that were just published but may not yet be in the
        //    Elasticsearch index (race condition: index is updated asynchronously after publication).
        const pendingIds = this.model.get('state._abtestPendingCollectionIds') || [];
        if (pendingIds.length) {
            this.model.set('state._abtestPendingCollectionIds', [], { notify: false, registerModified: false });
        }
        const mergedIds = [...new Set([...collectionIds, ...pendingIds])];

        // 3) Get current stored collection id's
        const current = this.model.get('fields.abtestCollectionIds_json') || [];

        // 4) Check if modified, if so: Store new list on model and re-publish
        if (this.hasDiff(current, mergedIds)) {
            this.model.set('fields.abtestCollectionIds_json', mergedIds);
            this.model.set('fields.lab_override_config_presentation', this.getPreloadConfig(mergedIds));
            setTimeout(() => {
                this.api.v1.app.publish();
            }, 1000);
        }
    }

    // (array) Get id of all collections used on current page
    async getCollections() {
        const ids = await this.api.v1.abtest.collection.listByPageId(this.model.get('id'));
        return ids ? ids.result : [];
    }

    // (boolean)
    hasDiff(array1, array2) {
        if (array1.length !== array2.length) {
            return true;
        }
        for (const id of array1) {
            if (!array2.includes(id)) { return true; }
        }
        for (const id of array2) {
            if (!array1.includes(id)) { return true; }
        }
        return false;
    }

    // (string)
    getPreloadConfig(idList) {
        if (!idList.length) {
            return '';
        }
        const existingPreloadConfig = this.api.v1.config.get('preloadObject') || {}; 
        return JSON.stringify({
            preloadObject: {
                abtests: {
                    mode: 'presentation',
                    type: 'json',
                    timeout: 1000,
                    url: `{{api}}/api/v1/ab_collection?query=id:(${ encodeURIComponent(idList.join(' OR ')) })&content=full`,
                    path: 'ab_collections'
                },
                ...existingPreloadConfig
            }
        });
    }

}
