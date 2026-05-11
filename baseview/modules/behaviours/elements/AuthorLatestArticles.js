import { DateTimeHelper } from '../../lib/helpers/datetime/DateTimeHelper.js';

export default class AuthorLatestArticles {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.isEditor = this.api.v1.app.mode.isEditor();
        this.config = this.api.v1.config.get('contentbox_settings.authorLatestArticles') || {
            niceDates: true,
            dateFormat: '{{ DD }}.{{ MM }}.{{ YYYY }}'
        };
        this.preferredImageFormat = lab_api.v1.image.getPreferredImageFormat();

        // Tracks models already bound to avoid duplicate bindings if onReady fires multiple times
        this.boundModels = [];
    }

    // In the editor, respond to byline additions and removals by re-rendering.
    onReady(model, view) {
        if (!this.isEditor) {
			return;
		}

        const guid = model.getGuid();

        if (this.boundModels.includes(guid)) {
			return;
		}

        this.boundModels.push(guid);

		const articleMetaModel = this.api.v1.model.query.getModelByType('articleMeta');

		lab_api.v1.model.on('childAdded', (params) => {
			if(params.parentModel === articleMetaModel) {
            	this.api.v1.model.redraw(model);
			}
		});

		this.api.v1.model.on('childRemoved', (params) => {
			if(params.parentModel === articleMetaModel) {
            	this.api.v1.model.redraw(model);
			}
		})
    }

    // Returns the instance_of IDs of all byline elements on the current article page.
    // These IDs correspond to the author person nodes and match the byline_ids field
    // returned by the front API, which we use to filter articles in onRender.
    _getBylineInstanceIds() {
        const bylineModels = this.api.v1.model.query.getChildrenOfType(this.rootModel, 'byline', true) || [];
        return bylineModels.map((b) => parseInt(b.get('instance_of'), 10)).filter(Boolean);
    }

    // We can't filter by author in the Solr query because byline data is not indexed
    // as a searchable field — it's only added to the response after Solr retrieval.
    // Instead, we fetch recent articles (date-filtered only) with an inflated limit
    // so onRender has enough results to filter down to the configured count.
    onViewHelper(model, view) {
        const limit = parseInt(model.get('metadata.articleCount') || 3, 10);
        const daysAgo = parseInt(model.get('metadata.daysAgo') || 365, 10);
        const bylineIds = this._getBylineInstanceIds();

        let query = '';
        if (bylineIds.length > 0) {
            const currentId = this.rootModel.get('id');
            const publishedFrom = `NOW/DAY-${daysAgo}DAYS`;
            query = `published:[${publishedFrom} TO NOW]${currentId ? ` AND NOT id:${currentId}` : ''}`;
        }

        // Fetch more than the display limit so onRender can filter by author and still
        // have enough results. Capped at 50 to avoid excessive API responses.
        const fetchLimit = bylineIds.length > 0 ? Math.min(limit * 5, 50) : limit;

        model.setFiltered('query', encodeURIComponent(query));
        model.setFiltered('limit', fetchLimit);
        model.setFiltered('site_id', this.api.v1.site.getSite().id);
        model.setFiltered('displayOptions', {
            hideImage: !!model.get('metadata.hideImage'),
            hideKicker: !!model.get('metadata.hideKicker'),
            hideDate: !!model.get('metadata.hideDate'),
            showSubtitle: !!model.get('metadata.showSubtitle'),
            showDivider: !!model.get('metadata.showDivider'),
            imageOnlyFirst: !!model.get('metadata.imageOnlyFirst'),
            hideDateIcon: !!model.get('metadata.hideDateIcon')
        });

        if (!this.isEditor) {
            model.setFiltered('lazyloadImages', lab_api.v1.config.get('imageLoading.lazy') || false);

            const imageWidth = 200;
            const aspectRatio = lab_api.v1.config.get('contentbox_settings.authorLatestArticles.imageAspectRatio') || lab_api.v1.config.get('image.defaultAspectRatio');
            const imgArgs = [
                `width=${imageWidth}`,
                `height=${Math.floor(imageWidth * aspectRatio)}`
            ];

            if (this.preferredImageFormat && this.preferredImageFormat !== 'jpg') {
                imgArgs.push(`format=${this.preferredImageFormat}`);
            }

            model.setFiltered('imageServer', this.api.v1.properties.get('image_server'));
            model.setFiltered('imgArgs', imgArgs.join('&'));
        }
    }

    // Filter the returned articles by matching byline_ids from the API response
    // against the current page's author IDs, then maps results to template data.
    onRender(model, view) {
        model.setFiltered('placeholder', this.api.v1.locale.get('emptyState.noContentText', { noRender: true }));

        const lang = this.api.v1.config.get('lang') || 'no';
        const dateHelper = new DateTimeHelper(lang);
        const external = view.get('external');
        const templateData = [];

        const limit = parseInt(model.get('metadata.articleCount') || 3, 10);
        const bylineIds = this._getBylineInstanceIds();
        const niceDates = model.get('metadata.niceDates') !== undefined ? !!model.get('metadata.niceDates') : this.config.niceDates;
        const dateFormat = this.api.v1.locale.get('dates.monthdayyear', { noRender: true }) || this.config.dateFormat;

        if (external && external.result) {
            for (const a of external.result) {
                if (templateData.length >= limit) break;
                if (a.type !== 'article') continue;

                // Skip articles that don't share at least one author with the current page
                if (bylineIds.length > 0) {
                    const articleBylineIds = (a.byline_ids || []).map((id) => parseInt(id, 10));
                    if (!bylineIds.some((id) => articleBylineIds.includes(id))) continue;
                }

                const dateString = a.published || null;
                const publishedDate = new Date(dateString);

                templateData.push({
                    kicker: a.kicker,
                    title: a.title,
                    subtitle: a.subtitle,
                    published_url: a.published_url,
                    frontCropUrl: a.frontCropUrl,
                    formatted: dateString && niceDates ? dateHelper.timestampToNiceDate(dateHelper.toTimestamp(publishedDate)) : dateHelper.format(publishedDate, dateFormat)
                });
            }
        }

        model.setFiltered('templateData', templateData);
        model.setFiltered('hasBylines', bylineIds.length > 0);
    }

}
