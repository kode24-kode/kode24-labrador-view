import { DateTimeHelper } from '../lib/helpers/datetime/DateTimeHelper.js';

export default class {

    constructor(api) {
        this.api = api;
        this.dateTimeHelper = new DateTimeHelper(this.api.v1.config.get('lang') || undefined);
        this.updateInterval = 30000; // Milliseconds, 10000 = 10 seconds
    }

    onProperties() {
        return {
            autoRefresh: 60
        };
    }

    onCreated(uiInterface, options) {
        const siteId = this.api.v1.eventmonitor.reader.getUiSelection('articles_latest_site_id');
        if (options.externalContentUpdater === true && options.updateContents) {
            this.updateContents = options.updateContents;
        }
        uiInterface.setProperty('query', {
            start: 0,
            limit: 24,
            orderBy: 'published',
            api: {
                id: null,
                tag: null,
                text: null,
                onlyMine: this.api.v1.eventmonitor.reader.getUiSelection('article_list_only_mine') || false
            },
            site_id: siteId
        });

        if (options.click) {
            uiInterface.setProperty('itemClickCallback', options.click);
        }
        if (options.end) {
            uiInterface.setProperty('endCallback', options.end);
        }
        if (options.display) {
            uiInterface.setProperty('displayCallback', options.display);
        }
        if (options.updateContent) {
            uiInterface.setProperty('updateContentCallback', options.updateContent);
        }

        this.api.v1.app.on('pageVisibilityChange', ({ isVisible }) => {
            if (isVisible) {
                if (uiInterface.getProperty('collectionIsVisible')) {
                    this.startUpdateInterval(uiInterface);
                }
            } else {
                this.endUpdateInterval(uiInterface);
            }
        });
    }

    onHeader(uiInterface, params) {
        const form = this.api.v1.util.dom.renderView('collections/articlesNotice/header', {}, true);
        const query = uiInterface.getProperty('query');

        const formHandler = (event) => {
            const formData = this.api.v1.util.dom.serializeForm(form);
            query.api.id = (formData.id || '').trim();
            query.api.tag = (formData.tag || '').trim();
            query.api.text = (formData.text || '').trim();
            query.api.onlyMine = !!formData.article_list_only_mine;
            query.site_id = (formData.articles_latest_site_id || '').trim();
            this.resetPager(uiInterface);
            uiInterface.getData();
        };

        // Create a select-element containig available sites.
        // The preferred site for user will be selected and stored when changed.
        const siteSelectEl = this.api.v1.ui.element.getSiteSelector({
            attributes: [{
                name: 'name',
                value: 'articles_latest_site_id'
            }],
            value: query.site_id,
            label: 'All sites'
        });

        query.site_id = siteSelectEl.value ? parseInt(siteSelectEl.value, 10) : '';
        form.querySelector('.site-container').appendChild(siteSelectEl);

        // Create a checkbox to toggle displaying articles from current user only.
        // The preferred state for user will be selected and stored when changed.
        form.querySelector('.article_list_only_mine-container').appendChild(this.api.v1.ui.element.getCheckboxElement({
            name: 'article_list_only_mine',
            label: 'Only mine'
        }));

        for (const formEl of [...form.querySelectorAll('input, select')]) {
            formEl.addEventListener('input', formHandler, false);
        }
        form.addEventListener('submit', (event) => {
            event.preventDefault();
        }, false);
        const toggleEl = form.querySelector('a');
        const expandableEl = form.querySelector('.expanded');
        if (toggleEl && expandableEl) {
            toggleEl.addEventListener('click', (event) => {
                event.preventDefault();
                expandableEl.classList.toggle('lab-hidden');
            }, false);
        }

        form.querySelector('.size-container').appendChild(this.api.v1.ui.element.getSizeElements({
            name: 'notice_list_preferred_size',
            btnSize: 'lab-small',
            css: 'lab-grid lab-autogrid lab-btn-group',
            sizes: ['small', 'medium', 'large'],
            callback: (preferredSize) => {
                uiInterface.setProperty('size', preferredSize);
                uiInterface.requestSize(preferredSize);
            }
        }));

        form.querySelector('.newNoticeBtn').addEventListener('click', this.api.v1.notice.ui.create);

        const preferredSize = this.api.v1.eventmonitor.reader.getUiSelection('notice_list_preferred_size');
        if (preferredSize) {
            uiInterface.setProperty('size', preferredSize);
            uiInterface.requestSize(preferredSize);
        }

        return form;
    }

    onFooter(uiInterface, options) {
        /**
         * Show a footer with buttons to navigate between pages.
         * Optional callback to 'updateContentCallback' can be used to update the footer.
         * @param {Object} uiInterface - The interface object used to update the UI.
         * @param {Object} options - Options for the footer.
         */
        const form = this.api.v1.util.dom.renderView('collections/articlesLatest/footer', {}, true);

        uiInterface.setDomElement('previewPageElement', form.querySelector('.lab-footer-prev'));
        uiInterface.getDomElement('previewPageElement').addEventListener('click', (event) => {
            this.navigate(uiInterface, false);
        }, false);

        uiInterface.setDomElement('nextPageElement', form.querySelector('.lab-footer-next'));
        uiInterface.getDomElement('nextPageElement').addEventListener('click', (event) => {
            this.navigate(uiInterface, true);
        }, false);

        form.querySelector('.lab-footer-reload').addEventListener('click', (event) => {
            uiInterface.getData(true);
        }, false);
        uiInterface.setDomElement('pageCounterElement', form.querySelector('.lab-footer-counter'));

        if (this.updateContents && this.updateContents.footer && this.updateContents.footer === true) {
            const updateContentCallback = uiInterface.getProperty('updateContentCallback');
            return updateContentCallback(form, { type: 'footer' });
        }

        return form;
    }

    onGetUrl(uiInterface) {
        const query = uiInterface.getProperty('query');
        const args = [
            `query=${ this.buildApiQueryString(uiInterface) }`,
            `orderBy=${ query.orderBy }`,
            `start=${ query.start }`,
            `site_id=${ query.site_id }`,
            `limit=${ query.limit }`,
            `htmlText=1`
        ];
        return `/api/v1/notice/?content=full&${ args.join('&') }`;
    }

    onMapData(uiInterface, data, options) {
        const labData = [];
        const serverData = data && data.result && Array.isArray(data.result) ? data : [];
        for (const item of serverData.result) {
            const article = this.articleData(item);
            labData.push(article);
        }
        this.updatePageNumber(uiInterface);
        return labData;
    }

    onItemProperties(uiInterface) {
        return {
            title: {
                path: 'filtered.title',
                content: null
            },
            description: {
                path: 'filtered.subtitle',
                content: null
            }
        };
    }

    onRendered(uiInterface, contentList) {
        uiInterface.setProperty('contentList', contentList);
        this.markExisting(uiInterface);
        if (uiInterface.getProperty('size') === 'large') {
            this.displayPublishDates(uiInterface, contentList);
        }
    }

    onChildAdded(uiInterface, model, element) {
        const itemClickCallback = uiInterface.getProperty('itemClickCallback');
        if (itemClickCallback) {
            element.addEventListener('click', (event) => {
                itemClickCallback(uiInterface, model, element, event);
                this.markExisting(uiInterface);
            }, false);
        }
    }

    onDisplayed(uiInterface, options) {
        this.startUpdateInterval(uiInterface);
        uiInterface.setProperty('collectionIsVisible', true);
        this.api.v1.model.on('childAdded', this.getArticleListener(uiInterface));
        this.api.v1.model.on('childRemoved', this.getArticleListener(uiInterface));
        this.markExisting(uiInterface);
    }

    onHidden(uiInterface) {
        this.endUpdateInterval(uiInterface);
        uiInterface.setProperty('collectionIsVisible', false);
        this.api.v1.model.off('childAdded', this.getArticleListener(uiInterface));
        this.api.v1.model.off('childRemoved', this.getArticleListener(uiInterface));
        const endCallback = uiInterface.getProperty('endCallback');
        if (endCallback) {
            endCallback(uiInterface);
        }
    }

    navigate(uiInterface, forward) {
        this.endUpdateInterval(uiInterface);
        const query = uiInterface.getProperty('query');
        if (forward) {
            query.start += query.limit;
        } else {
            query.start -= query.limit;
            if (query.start < 0) {
                query.start = 0;
            }
        }
        uiInterface.getData();
    }

    updatePageNumber(uiInterface) {
        const pageNumber = this.getPageNumber(uiInterface);
        const el = uiInterface.getDomElement('pageCounterElement');
        el.innerHTML = pageNumber;
        if (pageNumber < 2) {
            uiInterface.getDomElement('previewPageElement').setAttribute('disabled', 'disabled');
        } else {
            uiInterface.getDomElement('previewPageElement').removeAttribute('disabled');
        }
    }

    getPageNumber(uiInterface) {
        const query = uiInterface.getProperty('query');
        return Math.ceil(query.start / query.limit) + 1;
    }

    // (string) Build "query" for Labrador API v1.
    buildApiQueryString(uiInterface) {
        const query = uiInterface.getProperty('query');
        const params = [];
        if (query.api.id) {
            const idArray = query.api.id.split(/[\s,]+/).map((id) => this.trimInputText(id)).filter((id) => id);
            if (idArray.length) {
                params.push(`(id:(${ idArray.join(' OR ') }))`);
            }
        }
        if (query.api.tag) params.push(`(tag:("${ this.trimInputText(query.api.tag) }"))`);
        if (query.api.text) {
            params.push(`${ this.trimInputText(query.api.text) }*`);
        }
        if (query.api.onlyMine) {
            params.push('(has_published:me%20OR%20created_by:me)');
        }
        params.push('visibility_status:P');

        const result = params.join(' AND ');
        return result;
    }

    trimInputText(txt = '') {
        return txt.trim().replace(/"/g, '');
    }

    // (object) Create data for an article-element
    articleData(inputData) {
        const { field } = inputData.notice;
        const { tag } = inputData.notice.tag || {};
        const { id } = inputData.notice.attribute;
        let bylines = [];
        if (field.userName) {
            bylines = [{
                firstname: field.userName
            }];
        }

        // For an empty bodytext the API may return an object...
        if (typeof field.bodytext === 'object') {
            field.bodytext = '';
        }

        // Use a subset of the bodytext as subtitle.
        const subtitle = this.api.v1.util.string.stripTags(field.bodytext || '');
        const childrenData = [];
        if (inputData.notice.children && inputData.notice.children.image) {
            const imageData = Array.isArray(inputData.notice.children.image) ? inputData.notice.children.image[0] : inputData.notice.children.image;
            childrenData.push({
                type: 'image',
                contentdata: {
                    instance_of: imageData.attribute.instanceof_id,
                    fields: this.api.v1.view.helpers.image.getImageProperties(imageData.field)
                },
                children: []
            });
        }
        const articleData = {
            type: 'article',
            contentdata: {
                instance_of: parseInt(id, 10),
                tags: Array.isArray(tag) ? tag : [tag],
                fields: {
                    subtype: 'notice',
                    title: field.title,
                    subtitle: subtitle.substring(0, 200),
                    bodytext: field.bodytext,
                    published_url: field.published_url,
                    userName: field.userName,
                    modified: field.modified,
                    published: field.published,
                    site_id: field.lab_site_id || null,
                    site_alias: (this.api.v1.site.getSiteById(field.lab_site_id) || {}).alias,
                    full_bylines_json: bylines
                }
            },
            filtered: {
                title: field.title || '[No title]',
                subtitle: subtitle.substring(0, 120) || '[No text]'
            },
            children: childrenData
        };
        return articleData;
    }

    resetPager(uiInterface) {
        const query = uiInterface.getProperty('query');
        query.start = 0;
    }

    getArticleListener(uiInterface) {
        if (!uiInterface.getProperty('articleListener')) {
            const listener = (params) => {
                if (params.childModel.getType() === 'article') {
                    this.markExisting(uiInterface);
                }
            };
            uiInterface.setProperty('articleListener', listener);
        }
        return uiInterface.getProperty('articleListener');
    }

    markExisting(uiInterface) {
        const existing = this.api.v1.model.query.getModelsByType('article');
        const contentList = uiInterface.getProperty('contentList') || [];
        for (let item of contentList) {
            const id = item.model.get('instance_of');
            if (id) {
                if (this.hasId(id, existing)) {
                    item.element.classList.add('lab-highlight-item');
                    item.element.setAttribute('title', 'Article used on current page');
                } else {
                    item.element.classList.remove('lab-highlight-item');
                    item.element.setAttribute('title', '');
                }

                if (this.updateContents && this.updateContents.markExisting) {
                    const updateContentCallback = uiInterface.getProperty('updateContentCallback');
                    const params = {
                        type: 'markExisting',
                        id
                    };
                    item = updateContentCallback(item, params);
                }
            }
        }
    }

    hasId(id, list) {
        for (const model of list) {
            if (id === model.get('instance_of')) {
                return true;
            }
        }
        return false;
    }

    displayPublishDates(uiInterface, contentList) {
        for (const item of contentList) {
            const timestamp = item.model.get('fields.published');
            if (timestamp) {
                const el = document.createElement('p');
                el.classList.add('article-publish-date', 'lab-offstage-description', 'labicon-time');
                el.innerHTML = this.formatDate(timestamp * 1000);
                const id = item.model.get('instance_of');
                if (id) {
                    el.innerHTML += ` <a href="/edit/notice/id/${ id }" target="_blank" class="lab-btn lab-small">Edit</a>`;
                }
                item.element.querySelector('.lab-inner').appendChild(el);
            }
        }
    }

    formatDate(isoDateString) {
        if (!isoDateString) {
            return '';
        }
        const date = new Date(isoDateString);
        return this.dateTimeHelper.format(date, `${ this.dateTimeHelper.str('monthdayyear') } ${ this.dateTimeHelper.str('hourminute') }`);
    }

    /**
     * Starts an interval to update the UI with new data.
     * @param {Object} uiInterface - The interface object used to update the UI.
     */
    startUpdateInterval(uiInterface) {
        uiInterface.setProperty('updateIntervalId', window.setInterval(() => {
            uiInterface.getData(true, { isSilent: true });
        }, this.updateInterval));
    }

    /**
     * Stops the update interval for the UI interface.
     * @param {Object} uiInterface - The UI interface object.
     */
    endUpdateInterval(uiInterface) {
        window.clearInterval(uiInterface.getProperty('updateIntervalId'));
    }

}
