export class PublishUpdater {

    constructor(api, model) {
        this.api = api;
        this.model = model;
    }

    // (void)
    async willPublish() {

        // 1) Find all collections used on this page
        const collectionIds = await this.getCollections();

        // 2) Get current stored collection id's
        const current = this.model.get('fields.abtestCollectionIds_json') || [];

        // 3) Check if modified, if so: Store new list on model and re-publish
        if (this.hasDiff(current, collectionIds)) {
            this.model.set('fields.abtestCollectionIds_json', collectionIds);
            this.model.set('fields.lab_override_config_presentation', this.getPreloadConfig(collectionIds));
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
