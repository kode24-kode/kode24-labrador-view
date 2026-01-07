/* eslint no-param-reassign: ["error", { "props": false }] */

export default class LabradorSearch {

    constructor(api) {
        this.api = api;
    }

    onRender(model, view) {
        const searchTexts = ['submitLabel', 'navLabel', 'nohitsLabel', 'searchPlaceholder', 'advancedOpenText', 'advancedCloseText', 'fromDateLabel', 'toDateLabel', 'tagLabel', 'authorLabel', 'allSitesLabel'];
        searchTexts.forEach((text) => {
            const searchText = this.api.v1.locale.get(`search.labradorSearch.${ text }`, { noRender: true, fallbackValue: null });
            model.setFiltered(text, view.get(`fields.${ text }`) || searchText);
        });
        const siteList = lab_api.v1.properties.get('sites');
        const sites = [];
        const allowedSites = model.get('fields.allowedSites_json') || {};
        const allowedSitesList = [];

        siteList.forEach((site) => {
            const siteData = {
                alias: site.alias,
                id: site.id,
                displayName: site.display_name,
                selected: false
            };

            sites.push(siteData);

            if (allowedSites[site.alias] === `${ site.id }`) {
                siteData.selected = true;
                allowedSitesList.push(siteData);
            }
        });

        if (allowedSitesList.length === 0) {
            const currentSite = lab_api.v1.properties.get('site');
            sites.forEach((site) => {
                if (site.id === currentSite.id) {
                    site.selected = true;
                    allowedSitesList.push(site);
                }
            });
        }

        const orderBy = view.get('fields.orderBy') || 'published';
        const orderByOptions = [
            {
                value: 'published',
                label: 'Published'
            },
            {
                value: 'score',
                label: 'Score'
            }
        ];
        orderByOptions.forEach((item) => {
            if (orderBy && orderBy === item.value) {
                item.selected = true;
            }
        });

        // Todo: Add filtered.desktopWidth to new method returned in behavior onSettingsPanel ...
        const desktopWidth = parseInt(model.get('fields.desktopWidth') || 100, 10);
        model.setFiltered('desktopWidth', [100, 50, 33, 25].map((width) => ({ key: width, value: width, selected: width === desktopWidth })));
        model.setFiltered('desktopWidth', [{
            key: '100% - 1 column',
            value: 100,
            selected: desktopWidth === 100
        }, {
            key: '50% - 2 columns',
            value: 50,
            selected: desktopWidth === 50
        }, {
            key: '33% - 3 columns',
            value: 33,
            selected: desktopWidth === 33
        }, {
            key: '25% - 4 columns',
            value: 25,
            selected: desktopWidth === 25
        }]);

        model.setFiltered('sites', sites);
        model.setFiltered('allowedSites', allowedSitesList);
        model.setFiltered('allowedSitesString', JSON.stringify(allowedSitesList || []));
        model.setFiltered('orderByOptions', orderByOptions);
    }

}
