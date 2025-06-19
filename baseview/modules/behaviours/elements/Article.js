import { LayoutHelper } from '../../lib/helpers/LayoutHelper.js';
import { AutodataHelper } from '../../lib/helpers/AutodataHelper.js';
import { LanguageHelper } from '../../lib/helpers/LanguageHelper.js';
import { AutoFontSize } from '../../lib/helpers/AutoFontSize.js';
import { DateTimeHelper } from '../../lib/helpers/datetime/DateTimeHelper.js';

export default class Article {

    constructor(api) {
        this.api = api;
        this.imageServer = this.api.v1.properties.get('image_server');
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.domain = this.api.v1.site.getSite().domain || this.api.v1.properties.get('customer_front_url');
        this.fallbackLanguage = this.api.v1.config.get('contentLanguage') || '';
        this.autoFontSizeConfig = this.api.v1.config.get('autoFontSize') || [];
        this.autoFontSizePageSettings = Boolean(this.rootModel ? this.rootModel.get('fields.autoFontSize') : false);
        this.hasAutoFontSize = this.autoFontSizePageSettings && this.autoFontSizeConfig.enabled;
        this.autoFontSizeDone = false;
        this.dateTimeHelper = new DateTimeHelper(this.api.v1.config.get('lang') || undefined);
    }

    onInserted(model) {
        if (this.api.v1.app.mode.isEditor()) {
            // Check for auto font size status and set value of autoFontSize Enabled on teaser if empty
            // This is to set a status on all teaser before it's enabled

            if (this.hasAutoFontSize) {
                model.set('state.autoFontSizeReRender', true, { notify: false });
                const autoFontSizeListener = (model, path, value) => {
                    if (model.get('fields.title') === model.get('state.title')) {
                        model.set('state.autoFontSizeReRender', false, { notify: false });
                    } else {
                        model.set('state.autoFontSizeReRender', true, { notify: false });
                        model.set('metadata.autoFontSizeDone', false, { notify: false });
                    }
                };
                this.api.v1.model.bindings.bind(model, 'fields.title', autoFontSizeListener);
            }
        }
    }

    onReady(model, view) {
        // Define correct spot to print title, subtitle and kicker.
        // Use in template to include partials.
        // Run in onReady to make data avilable to children (image etc.)
        model.setFiltered('layout', LayoutHelper.textElements(view, this.api.v1.app.mode.isEditor()));

        let link = model.get('fields.published_url') || '';
        const regex = /^https?/;
        if (!regex.test(link) && link) link = this.domain + link;
        model.setFiltered('published_url', link);
        model.setFiltered('published_url_rss', link.replace(/&/g, '&amp;'));
    }

    onRender(model, view) {
        const articleId = model.get('instance_of') || model.get('fields.origin_data_json.id');
        const pubDate = model.get('fields.published') || model.get('fields.origin_data_json.published');
        const title =  model.get('fields.origin_data_json.teaserTitle') || view.get('fields.title') || '';
        const subtitle = model.get('fields.origin_data_json.teaserSubtitle') || view.get('fields.subtitle') || '';
        const publishedSitemap = model.get('fields.origin_data_json.published') || model.get('fields.published');
        const kicker = model.get('fields.origin_data_json.teaserKicker') || model.get('fields.origin_data_json.kicker') || view.get('fields.kicker');
        const siteId = model.get('fields.site_id') || model.get('fields.origin_data_json.site_id');
        const language = model.get('fields.origin_data_json.seolanguage') || model.get('fields.seolanguage') || this.fallbackLanguage;
        const audioUrl = model.get('fields.origin_data_json.teaserAudio') || model.get('fields.audio');
        const audioInfo = model.get('fields.origin_data_json.teaserAudio_style_json') || model.get('fields.audioInfo') || {};
        const addRelNoFollow = model.get('fields.origin_data_json.addRelNoFollow') || model.get('fields.addRelNoFollow') || false;
        const addRelSponsored = model.get('fields.origin_data_json.addRelSponsored') || model.get('fields.addRelSponsored') || false;
        const addRelUgc = model.get('fields.origin_data_json.addRelUgc') || model.get('fields.addRelUgc') || false;

        model.setFiltered('published', pubDate); // Only used by rss-template
        model.setFiltered('title', title);
        model.setFiltered('kicker', kicker);
        model.setFiltered('subtitle', subtitle);
        model.setFiltered('articleId', articleId);
        model.setFiltered('section', model.get('fields.origin_data_json.section_tag') || model.get('fields.section') || '');
        model.setFiltered('base_url', this.domain);
        model.setFiltered('published_sitemap', publishedSitemap);
        model.setFiltered('canonical_url', `${ this.getSiteDomain(siteId) }/a/${ articleId }`);
        model.setFiltered('tags', model.get('tags') || []);
        model.setFiltered('languageIso639', LanguageHelper.convertToIso639(language));
        const timestampOutOfDateDays = new Date().getTime() - (2 * 24 * 60 * 60 * 1000);
        model.setFiltered('articleOutOfDate_sitemap', timestampOutOfDateDays > Math.floor(new Date(publishedSitemap).getTime()));
        model.setFiltered('addRelNoFollow', addRelNoFollow);
        model.setFiltered('addRelSponsored', addRelSponsored);
        model.setFiltered('addRelUgc', addRelUgc);

        if (!this.api.v1.config.get('showHiddenTagsOnFront')) {
            const tagsToIgnore = (this.api.v1.config.get('tagsToHide') || '').split(',').map((tag) => tag.trim()) || [];
            const filteredTags = (model.get('tags') || []).filter((tag) => !tagsToIgnore.includes(tag));
            model.setFiltered('tags', filteredTags);
        }

        // Site:
        if (siteId) {
            const site = this.api.v1.site.getSiteById(siteId);
            if (site) {
                model.setFiltered('site_alias', site.alias);
            }
        }

        if (audioUrl) {
            const audio = {
                url: audioUrl
            };
            if (audioInfo) {
                const info = JSON.parse(audioInfo);
                audio.title = info.title || null;
                audio.fileType = info.fileType || null;
                audio.playTime = info.playTime || null;
            }
            model.setFiltered('audio', audio);
        }

        // Byline-display:
        const displayByline = model.get('fields.origin_data_json.showbylineonfp') || view.get('fields.displayByline') || false;
        if (displayByline) {
            const bylineName = view.get('fields.byline') || model.get('fields.origin_data_json.byline');
            const bylineImage = view.get('fields.bylineImage') || model.get('fields.origin_data_json.bylineImage');
            const bylineArray = model.get('fields.origin_data_json.full_bylines') || model.get('fields.full_bylines_json') || [];
            const bylines = bylineArray.map((byline) => ({
                firstname: byline.firstname,
                lastname: byline.lastname,
                description: byline.description,
                imageUrl: byline.imageUrl ? this.getImageUrl(`${ byline.imageUrl }&width=90&height=90`) : ''
            }));
            // For old article teasers without full bylines:
            if (!bylines.length && (bylineName || bylineImage)) {
                bylines.push({
                    firstname: bylineName,
                    lastname: '',
                    imageUrl: bylineImage ? this.getImageUrl(`${ bylineImage }&width=90&height=90`) : ''
                });
            }
            model.setFiltered('bylines', bylines);
            if (bylineImage) {
                model.setFiltered('bylineImage', `${ bylineImage }&width=90&height=90`);
            }
        }
        model.setFiltered('displayByline', displayByline);

        // Get the published date and the date format, then set the state for if it should be displayed
        const displayPublishedDate = view.get('fields.displayPublishedDate') || false;
        const dateFormat = this.api.v1.locale.get('dates.monthdayyear', { noRender: true });
        model.setFiltered('displayPublishedDate', displayPublishedDate);

        if (displayPublishedDate) {
            // Check if the article is published, and if we are in the editor
            if (this.api.v1.app.mode.isEditor() && !pubDate) {
                // Without being published and in editor, show the date format
                // This will apply to automatic articles, and empty articles
                model.setFiltered('publishedDate', dateFormat);
            } else if (!this.api.v1.app.mode.isEditor() && !pubDate) {
                // If the article is not publised (so an empty article) and we are on front, it should not be shown
                model.setFiltered('displayPublishedDate', false);
            } else {
                // Otherwise show the published date formatted
                const publishedDate = new Date(pubDate);
                const publishedDateFormatted = this.dateTimeHelper.format(publishedDate, dateFormat);
                model.setFiltered('publishedDate', publishedDateFormatted);
            }
        }

        // Paywall
        let paywall = model.get('fields.origin_data_json.paywall') || model.get('fields.paywall') || false;
        if (paywall === 1 || paywall === '1' || paywall === true) {
            paywall = true;
        } else {
            paywall = null;
        }
        if (paywall) {

            const paywallLabel = {
                ...{
                    display: true,
                    displayInNewsletter: true
                },
                ...this.api.v1.config.get('paywall.label')
            };

            // Get the paywall label text and icon from the config or default values.
            // Check if the values exists, i.e. they have been set in the config files for the site, if they have not, set a default value.
            // This should make all config values where the users have set the value to be an empty string still show nothing
            const textValue = this.api.v1.config.get('paywall.label.text.content');
            const iconValue = this.api.v1.config.get('paywall.label.icon.content');
            const textContent = (textValue ===  undefined || textValue === null) ? 'Plus' : this.api.v1.config.get('paywall.label.text.content');
            const iconContent = (iconValue === undefined || iconValue === null) ? 'fi-plus' : this.api.v1.config.get('paywall.label.icon.content');

            // Create an object that can be added to the paywallLabel object
            // This will add empty objects if config values are not set in admin, but that is fine.
            const labelIcon = { text: { content: textContent }, icon: { content: iconContent } };
            Object.assign(paywallLabel, labelIcon);

            if (paywallLabel.display) {
                paywallLabel.layout = {
                    noImage: true,
                    float: null
                };
                const imageChild = this.api.v1.model.query.getChildOfType(model, 'image') || this.api.v1.model.query.getChildOfType(model, 'graphic');
                if (imageChild && imageChild.get('instance_of')) {
                    const imageView = this.api.v1.view.getView(imageChild, view.getViewport());
                    paywallLabel.layout.float = this.api.v1.config.get('paywall.label.labelPosition') || imageView.get('fields.float');
                    paywallLabel.layout.noImage = !!view.get('metadata.hideimage');
                }
                model.setFiltered('paywallLabel', paywallLabel);
            }
        } else {
            model.setFiltered('paywallLabel', null);
        }
        model.setFiltered('paywall', paywall);

        // Tag placement
        const tagPlacement = model.get('metadata.tagPlacement') || 'underImage';
        model.setFiltered('tagPlacement.underImage', tagPlacement === 'underImage');
        model.setFiltered('tagPlacement.underText', tagPlacement === 'underText');

        // Section placement
        const sectionPlacement = model.get('metadata.sectionPlacement') || 'floating';
        model.setFiltered('sectionPlacement.floating', sectionPlacement === 'floating');
        model.setFiltered('sectionPlacement.underImage', sectionPlacement === 'underImage');
        model.setFiltered('sectionPlacement.underText', sectionPlacement === 'underText');

        // Mailmojo
        model.setFiltered('articleWidth', view.getPixelWidth());

        // Autodata
        model.setFiltered('autodata_css', AutodataHelper.parseCss(model));
        model.setFiltered('autodata_content_css', AutodataHelper.parseCss(model, 'filtered.autodata_content'));
        model.setFiltered('autodata_attributes', AutodataHelper.parseAttributes(model));
        model.setFiltered('autodata_custom', AutodataHelper.parseCustomData(model));

        if (this.autoFontSizeConfig.enabled) {
            this.autoFontSizeDone = model.get('metadata.autoFontSizeDone');
        }
    }

    onRendered(model, view) {
        if (this.api.v1.app.mode.isEditor()) {
            if (this.autoFontSizeConfig.enabled) {
                // Small reset when you click inside teaser title to edit
                const resetAutoFontSizeOnTool = () => {
                    const domElement = view.getMarkup();
                    const title = domElement.querySelector('.headline');
                    AutoFontSize.removeFontSize(title);
                    this.api.v1.tool.off('ended', resetAutoFontSizeOnTool);
                };
                if ((view.viewport === 'desktop' && this.hasAutoFontSize && model.get('metadata.autoFontSizeEnabled'))) {
                    this.api.v1.tool.on('started', (params) => {
                        if (params.key === 'fields.title' && params.model === model) {
                            resetAutoFontSizeOnTool();
                        }
                    });
                    if (model.get('state.autoFontSizeReRender') && model.get('fields.title') && !this.autoFontSizeDone && model.get('metadata.autoFontSizeEnabled')) {
                        const domElement = view.getMarkup();
                        const title = domElement.querySelector('.headline');
                        const newTitle = AutoFontSize.autoSizeText(title, this.autoFontSizeConfig);
                        model.set('state.autoFontSizeReRender', false, { notify: false });
                        model.set('state.title', newTitle, { notify: false });
                        model.set('metadata.autoFontSizeDone', true, { notify: false });
                        model.set('fields.title', newTitle);
                    }
                }
            }
        }
    }

    onCreated(model) {
        if (this.hasAutoFontSize && model.get('metadata.autoFontSizeEnabled') === null) {
            model.set('metadata.autoFontSizeEnabled', true, { notify: false });
        }
    }

    getSiteDomain(siteId) {
        if (!siteId) { return ''; }
        const site = this.api.v1.site.getSiteById(siteId);
        if (!site) { return ''; }
        return site.domain;
    }

    getImageUrl(url) {
        if (!url) { return ''; }
        if (url.startsWith('http')) { return url; }
        return this.imageServer + url;
    }
}
