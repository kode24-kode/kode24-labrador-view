export default class {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.pageAutomaticMode = [true, 'true', '1', 1].includes(this.rootModel.get('fields.automatic'));
        this.authorPagesConfig = this.api.v1.config.get('authorPages') || {};
    }

    onCreated(uiInterface, options) {
        uiInterface.setProperty('query', {
            filter: ''
        });
    }

    onHeader(uiInterface, params) {
        const form = this.api.v1.util.dom.renderView('collections/articlesAuto/header', {}, true);
        const query = uiInterface.getProperty('query');
        const formHandler = (event) => {
            event.preventDefault();
            const formData = this.api.v1.util.dom.serializeForm(form);
            query.filter = (formData.filter || '').trim();
            uiInterface.getData();
        };
        form.addEventListener('submit', formHandler, false);
        for (const formEl of [...form.querySelectorAll('input')]) {
            formEl.addEventListener('input', formHandler, false);
        }
        return form;
    }

    onGetData(uiInterface, options) {
        const feeds = this.api.v1.config.get('feeds') || {};
        const query = uiInterface.getProperty('query') || { filter: '' };
        const filterText = query.filter.toLowerCase();
        const imageId = 1018;
        const icon = `https://publishlab.com/pbl2.jpg?v=${ imageId }`;
        const authorPath = this.rootModel.get('fields.hostpath') || '';
        const authorCustomPath = this.authorPagesConfig.path || 'author';

        // Apply filtering based on display_name, feed key, and url if filter is provided
        let filteredFeeds = Object.keys(feeds).filter((key) => (!(!this.pageAutomaticMode && feeds[key].auto_only === true)));
        if (filterText) {
            filteredFeeds = filteredFeeds.filter((key) => {
                const feed = feeds[key];
                return (
                    (feed.display_name && feed.display_name.toLowerCase().includes(filterText))
                    || (key && key.toLowerCase().includes(filterText))
                    || (feed.url && feed.url.toLowerCase().includes(filterText))
                );
            });
        }

        const result = filteredFeeds.map((key) => ({
            type: 'article',
            contentdata: {
                fields: {
                    title: `Feed: ${ feeds[key].display_name }`,
                    subtitle: `<em>${ feeds[key].display_name }</em>`,
                    feedId: key,
                    isAutomatic: true
                }
            },
            children: [{
                type: 'image',
                contentdata: {
                    fields: {
                        external_id: `lab_head_${ imageId }`,
                        imageurl: icon,
                        source: '_articlefeed'
                    }
                }
            }]
        }));

        if (this.pageAutomaticMode) {
            result.unshift({
                type: 'article',
                contentdata: {
                    fields: {
                        title: `Labrador Tag Feed`,
                        subtitle: 'Automatic article from <em>Labrador Tag Feed</em>',
                        feedId: '_tag',
                        isAutomatic: true
                    }
                },
                children: [{
                    type: 'image',
                    contentdata: {
                        fields: {
                            external_id: `lab_head_${ imageId }`,
                            imageurl: icon,
                            source: '_articlefeed'
                        }
                    }
                }]
            });
        }

        // Only add author box if authorPages is enabled
        if (this.authorPagesConfig.enabled && (authorPath === 'author' || authorPath === authorCustomPath)) {
            result.unshift({
                type: 'authorBox',
                contentdata: {
                    fields: {
                        title: `Author box`,
                        subtitle: 'Use when building authorpages to display author info.',
                        full_name: 'FirstName LastName',
                        description: 'Short author description here...',
                        description2: 'Extended author description here...',
                        public_phone: '+47 123 45 678',
                        public_url: 'https://www.example.com',
                        public_email: 'author@example.com'
                    }
                },
                children: [{
                    type: 'image',
                    contentdata: {
                        fields: {
                            external_id: `lab_head_${ imageId }`,
                            imageurl: icon,
                            source: '_articlefeed'
                        }
                    }
                }]
            });
        }

        return result;
    }

    onProperties(uiInterface) {
        return {
            css: 'autoarticles'
        };
    }

}
