export default class InfiniteScroll {

    constructor(api) {
        this.api = api;
    }

    onRender(model, view) {
        const infiniteSource = model.get('fields.infiniteSource') || 'api';
        const infiniteFeed = model.get('fields.infiniteFeed');

        if (this.api.v1.app.mode.isEditor()) {
            const sourceOptions = [
                {
                    value: 'api',
                    label: 'All articles from site',
                    selected: infiniteSource === 'api'
                },
                {
                    value: 'feed',
                    label: 'Articles from feed',
                    selected: infiniteSource === 'feed'
                }
            ];
            model.setFiltered('sourceOptions', sourceOptions);
            model.setFiltered('displayFeeds', infiniteSource === 'feed');

            const feeds = this.api.v1.config.get('feeds');
            const feedOptions = [];
            for (const [key, value] of Object.entries(feeds)) {
                const feed = {
                    value: key,
                    label: value.display_name,
                    selected: infiniteFeed === key
                };
                feedOptions.push(feed);
            }
            model.setFiltered('feedOptions', feedOptions);

            if (infiniteSource === 'api') {
                model.setFiltered('sourceInfo', 'Currently fetching all articles from this site');
            } else if (infiniteSource === 'feed') {
                model.setFiltered('sourceInfo', `Currently fetching articles from feed "${ infiniteFeed }"`);
            }
        }

        model.setFiltered('infiniteSource', infiniteSource);
        model.setFiltered('infiniteFeed', infiniteFeed);

    }

}
