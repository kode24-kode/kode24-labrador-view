export default class Twitter {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
    }

    onViewHelper(model, view) {
        const lang = model.get('fields.lang') || lab_api.v1.config.get('lang') || 'no';
        model.setFiltered('lang', lang);

        const twitterUrl = model.get('fields.tweeturl');
        if (twitterUrl) {
            const match = twitterUrl.match(/status\/(\d+)/);
            if (match) {
                model.setFiltered('tweetId', match[1]);
            }
        }
    }

}
