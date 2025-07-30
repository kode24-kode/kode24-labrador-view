export default class {

    constructor(api) {
        this.api = api;
        this.siteId = this.api.v1.site.getSite().id;
    }

    onCreated(uiInterface, options) {
        if (options.clickHandler && typeof options.clickHandler === 'function') {
            uiInterface.setProperty('clickHandler', options.clickHandler);
        }
    }

    onChildAdded(uiInterface, model, element) {
        element.addEventListener('click', (event) => {
            const clickHandler = uiInterface.getProperty('clickHandler');
            if (clickHandler) {
                uiInterface.hide();
                clickHandler(uiInterface.prepareForStage(model), element);
            }
        }, false);
    }

    onItemProperties(uiInterface) {
        return {
            title: {
                path: 'fields.title',
                content: null
            },
            description: {
                path: 'fields.fileType',
                content: null
            },
            url: {
                path: 'fields.url'
            }
        };
    }

    onMapData(uiInterface, data) {
        const results = [];
        data.forEach((item) => {
            results.push({
                type: 'audio',
                contentdata: {
                    fields: {
                        title: item.title,
                        fileType: item.fileType,
                        url: item.url,
                        playTime: item.length
                    }
                }
            });
        });
        return results;
    }

    onGetUrl(uiInterface, options) {
        return `/ajax/soundplayer/list?siteId=${ this.siteId }`;
    }

}
