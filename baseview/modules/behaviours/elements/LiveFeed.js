export default class LiveFeed {

    constructor(api) {
        this.api = api;
        this.baseApiUrl = this.api.v1.properties.get('front_api_url');
        this.siteId = this.api.v1.properties.get('site.id');
        this.cache = new Map();
        this.defaultMaxCount = 100;
        this.isEditor = this.api.v1.app.mode.isEditor();
    }

    onPrepareViewHelper(model, view) {
        const site = model.get('fields.site') || this.siteId;
        const maxNoticesCount = view.get('fields.maxNoticesCount') || this.defaultMaxCount;
        const tags = (model.get('fields.tags') || '').toLowerCase().split(',').filter((tag) => tag !== '');
        const preparedTags = this.prepareTags(tags);
        const query = this.prepareQuery(preparedTags, false);
        const clientQuery = this.prepareQuery(preparedTags, true);
        const url = `${ this.baseApiUrl }/notice?content=full&site_id=${ site }&limit=${ maxNoticesCount }`;
        model.setFiltered('query', query);
        model.setFiltered('clientQuery', clientQuery);
        model.setFiltered('url', url);
    }

    onReady(model, view) {
        const external = view.get('external');
        const noFetch = model.get('filtered.noFetch') || false;
        const blacklist = model.get('metadata.blacklist') || [];
        const maxNoticesCount = view.get('fields.maxNoticesCount') || this.defaultMaxCount;
        if (!noFetch && external) {
            model.setFiltered('noFetch', true);
            const pinneNotices = model.get('fields.pinnedNotices_json') || [];

            let items = external.result;
            if (this.api.v1.app.mode.isEditor()) {
                const children = this.api.v1.model.query.getModelsByType('notice', model.children);
                for (const child of children) {
                    this.api.v1.model.delete(child, true, true);
                }
            }
            items = items.slice(0, maxNoticesCount);

            items.forEach((item) => {
                const { attribute = {}, field = {} } = item.notice;
                if (blacklist.includes(parseInt(attribute.id || 0, 10))) {
                    Sys.logger.warn(`Notice with id ${ attribute.id } is blacklisted from Livefeed and will not be displayed.`);
                    return;
                }

                // For an empty bodytext the API may return an object...
                // https://publishlab.atlassian.net/browse/FS-2081
                if (typeof field.bodytext === 'object') {
                    field.bodytext = '';
                }
                const {
                    title, bodytext, published, modified, published_url, userName
                } = field;
                const children = [];
                if (item.notice.children && item.notice.children.image) {
                    const images = Array.isArray(item.notice.children.image) ? item.notice.children.image : [item.notice.children.image];
                    for (const image of images) {
                        let metadata = {};
                        if (field.structure_json && image.attribute.id) {
                            try {
                                const structureData = JSON.parse(field.structure_json);
                                for (const itm of structureData) {
                                    if (itm.type === 'bodytext') {
                                        const structure = this.getStructure(itm.children || [], image.attribute.id);
                                        metadata = structure ? structure.metadata : {};
                                        break;
                                    }
                                }
                            } catch (e) {
                                Sys.logger.warn(`Failed to parse structure data: ${ e.toString() }`);
                            }
                        }
                        // Disable fullwidth inside the feed
                        metadata.hasFullWidth = {
                            desktop: false,
                            mobile: false
                        };
                        children.push(this.getImageData(image, metadata || {}));
                    }
                }

                this.api.v1.model.insert.atPath({
                    path: model.getPositionedPath(),
                    data: {
                        type: 'notice',
                        contentdata: {
                            id: attribute.id,
                            fields: {
                                title,
                                bodytext,
                                published,
                                modified,
                                published_url,
                                userName,
                                pinned: pinneNotices.includes(attribute.id)
                            },
                            // Note 'tag' can be a string with one tag or an array of multiple tags
                            tags: item.notice.tag ? item.notice.tag.tag : ''
                        },
                        state: {
                            isNonPersistent: true,
                            editNonPersistent: true
                        },
                        children
                    },
                    options: {
                        silent: true,
                        index: pinneNotices.includes(attribute.id) ? 0 : undefined
                    }
                });
            });

            // Sort notices by pinned status and id
            model.children.sort((a, b) => {
                if (pinneNotices.includes(a.getId())) {
                    return -1;
                }
                if (pinneNotices.includes(b.getId())) {
                    return 1;
                }
                return b.getId() - a.getId();
            });

            if (this.api.v1.app.mode.isEditor()) {
                this.api.v1.model.addToRedrawQueue(model, true);
                this.api.v1.app.save();
            }
        }
        // All numbers are in seconds
        const updateFrequency = this.api.v1.config.get('contentbox_settings.livefeed.updateFrequency') || [{
            range: [0, 600],
            interval: 10
        }, {
            range: [600, 1200],
            interval: 30
        }, {
            range: [1200],
            interval: 60
        }];
        model.setFiltered('updateFrequency', JSON.stringify(updateFrequency));
    }

    onRender(model, view) {
        const placeholder = view.get('fields.placeholder');
        model.setFiltered('placeholder', placeholder || this.api.v1.locale.get('emptyState.noContentText', { noRender: true }));
        model.setFiltered('initialRenderTime', (new Date()).getTime());
        model.setFiltered('dateStrings', JSON.stringify({
            now: this.api.v1.locale.get('dates.now', { noRender: true }),
            monthdayyear: this.api.v1.locale.get('dates.monthdayyear', { noRender: true }),
            hourminute: this.api.v1.locale.get('dates.hourminute', { noRender: true }),
            durationSince: this.api.v1.locale.get('dates.durationSince', { noRender: true }),
            minute: this.api.v1.locale.get('dates.minute', { noRender: true }),
            minutes: this.api.v1.locale.get('dates.minutes', { noRender: true }),
            hour: this.api.v1.locale.get('dates.hour', { noRender: true }),
            hours: this.api.v1.locale.get('dates.hours', { noRender: true }),
            day: this.api.v1.locale.get('dates.day', { noRender: true }),
            days: this.api.v1.locale.get('dates.days', { noRender: true }),
            ago: this.api.v1.locale.get('dates.ago', { noRender: true })
        }));
    }

    onChildAdded(model, child) {
        if (!this.isEditor) {
            return;
        }
        if (child.getType() !== 'notice') {
            // Other content added. Make sure it is placed below pinned notices.
            // (After a new fetch this is handled anyway, but not right away)
            if (model.children.indexOf(child) > 0) {
                return; // Recursion. Already in correct position
            }
            const pinned = this.api.v1.model.query.getModelsByType('notice', model.children).filter((notice) => notice.get('fields.pinned'));
            if (!pinned.length) {
                return;
            }
            let index = 0;
            for (const m of pinned) {
                if (model.children.indexOf(m) > index) {
                    index = model.children.indexOf(m);
                }
            }
            if (index > 0) {
                this.api.v1.model.addChild(model, child, index, false);
            }
        }
    }

    prepareQuery(preparedTags, isClientRendering = false) {
        const query = isClientRendering ? ['(visibility_status:P OR visibility_status:H)'] : ['visibility_status:P'];
        if (preparedTags.length > 0) {
            query.push(`(${ preparedTags.join(` OR `) })`);
        }

        return `&query=${ encodeURIComponent(query.join(' AND ')) }`;
    }

    prepareTags(list) {
        return list.map((tag) => {
            let modifiedTag = tag.trim();
            if (modifiedTag.indexOf(' ') > -1) {
                modifiedTag = `"${ modifiedTag }"`;
            }
            return `tag:${ modifiedTag }`;
        });
    }

    // Transform from API-format to view format
    getImageData(apiImage, meta) {
        return this.api.v1.model.serialize.apiToView({ type: 'image', data: apiImage, meta });
    }

    onSettingsPanel(model, view, settings) {
        const elements = {
            layout: null,
            container: null
        };
        return {
            onDisplay: ({
                model, view, config, markup, modal
            }) => {
                elements.layout = markup.querySelector('#layout');
                elements.container = markup.querySelector('.horizontalOptions');
                if (elements.layout && elements.container) {
                    elements.layout.addEventListener('change', (event) => {
                        if (elements.layout.value === '1') {
                            elements.container.classList.remove('lab-hidden');
                        } else {
                            elements.container.classList.add('lab-hidden');
                        }
                    });
                }
            },
            onHide: ({
                model, view, config, markup, modal
            }) => {
                elements.layout = null;
                elements.container = null;
                // Reset filtered.noFetch to allow updating notices in the editor in case tag changes.
                model.setFiltered('noFetch', false);
            }
        };
    }

    getStructure(items, imageId) {
        for (const item of items) {
            // Note: Use == instead of === to allow for type conversion
            // eslint-disable-next-line eqeqeq
            if (item.type === 'image' && item.node_id == imageId) {
                return item;
            }
            if (item.children) {
                const structure = this.getStructure(item.children, imageId);
                if (structure) {
                    if (structure.metadata && !structure.metadata.bodyTextIndex && item.metadata && item.metadata.bodyTextIndex) {
                        structure.metadata.bodyTextIndex = item.metadata.bodyTextIndex;
                    }
                    return structure;
                }
            }
        }
        return null;
    }

}
