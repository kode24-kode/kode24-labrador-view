import { DateTimeHelperInt } from '../../lib/helpers/datetime/DateTimeHelperInt.js';

export default class Toplist {

    constructor(api) {
        this.api = api;
        this.boundModels = [];
    }

    onViewHelper(model, view) {
        /**
         * Process data before fetching external data for the toplist.
         * Sets up filtered parameters for the external data URL.
         * @param {Object} model - The model object - the toplist.
         * @param {Object} view - The view object - the toplist view (mobile/desktop).
         */
        // Get tab data from view
        const domain = this.getDomain(model);
        model.setFiltered('domain', domain);

        const limit = model.get('fields.limit') || 5;
        model.setFiltered('limit', limit);

        const tabMode = model.get('fields.tabs');
        if (!tabMode || tabMode === 'default') {
            model.setFiltered('multi', '');
            model.setFiltered('splitOn', '');
        } else {
            model.setFiltered('multi', '-multi');
            model.setFiltered('splitOn', `&splitOn=${ tabMode }`);
        }

        const tags = model.get('fields.tagsSelected') || '';
        const tagsArray = tags.split(',')
            .map((tag) => tag.trim().toLowerCase())
            .map((tag) => tag.replace(/ /g, '%20'))
            .filter((tag) => tag.length > 0);
        if (tagsArray.length > 0) {
            model.setFiltered('tags', `&tags=${ tagsArray.join(',') }`);
        } else {
            model.setFiltered('tags', '');
        }

        // Set up paywall label configuration
        const paywallLabel = {
            ...{
                display: true,
                displayInNewsletter: true
            },
            ...this.api.v1.config.get('paywall.label')
        };

        // Get the paywall label text and icon from the config or default values
        const textValue = this.api.v1.config.get('paywall.label.text.content');
        const iconValue = this.api.v1.config.get('paywall.label.icon.content');
        const textContent = (textValue === undefined || textValue === null) ? 'Plus' : textValue;
        const iconContent = (iconValue === undefined || iconValue === null) ? 'fi-plus' : iconValue;

        // Create label icon object
        const labelIcon = { text: { content: textContent }, icon: { content: iconContent } };
        Object.assign(paywallLabel, labelIcon);

        model.setFiltered('paywallLabel', paywallLabel);
    }

    getDomain(model) {
        /**
         * Get selected domains from the model.
         * If no domains are selected, fallback to the current site domain.
         * @param {Object} model - The model object - the toplist.
         */
        // Set all data
        const domains = [];
        this.api.v1.site.getSites().forEach((site) => {
            const siteSelected = model.get(`fields.domains_${ site.alias }`);
            if (siteSelected) {
                let currentDomain = site.domain.replace(/^https?:\/\//, '');
                if (site.domain.includes('labdevs')) {
                    if (site.domain_aliases && site.domain_aliases.length > 0) {
                        // If domain_aliases is set, use the first alias as the current domain
                        const aliases = site.domain_aliases.split('\n');
                        if (aliases.length > 0) {
                            currentDomain = this.getCleanDomain(aliases[0]);
                        } else {
                            currentDomain = this.getCleanDomain(site.domain_aliases);
                        }
                    }
                }
                domains.push(currentDomain);
            }
        });

        if (domains.length === 0) {
            // Fallback to default domain if no site is selected.
            const site = lab_api.v1.site.getSite();
            if (site) {
                let fallbackDomain = site.domain;
                // Special handling for labdevs domain
                if (site.domain.includes('labdevs')) {
                    fallbackDomain = this.handleLabdevsDomain(site, fallbackDomain);
                }
                fallbackDomain = this.getCleanDomain(fallbackDomain);
                domains.push(fallbackDomain);
            }
        }
        return domains;
    }

    onRender(model, view) {
        /**
         * Process data before rendering the toplist.
         * Sets default values so that existing toplists are not broken when new fields are added.
         * Uses external data to fetch articles from Kilkaya API.
         * The external data uses -multi endpoint when request needs to handle multiple values in specific params
         * @param {Object} model - The model object - the toplist.
         * @param {Object} view - The view object - the toplist view (mobile/desktop).
         */
        const placeholder = view.get('fields.placeholder');
        model.setFiltered('placeholder', placeholder || this.api.v1.locale.get('emptyState.noContentText', { noRender: true }));

        const tabMode = model.get('fields.tabs') || 'default';
        const domains = this.getDomain(model);

        // Set default values
        if (!model.get('fields.imageWidth')) {
            model.set('fields.imageWidth', 100);
        }
        if (!model.get('fields.imageHeight')) {
            model.set('fields.imageHeight', 100);
        }
        if (!model.get('fields.limit')) {
            model.set('fields.limit', 5);
        }
        const limit = model.get('fields.limit');

        if (!model.get('fields.displayKicker')) {
            model.set('fields.displayKicker', 'hideKicker');
        }

        if (!model.get('fields.displayPaywall')) {
            model.set('fields.displayPaywall', 'hidePaywallLabel');
        }

        // Fetching external data and processing results
        const externalData = view.get('external');
        const source = externalData && typeof (externalData) === 'object' ? externalData : this.getPlaceholderData(limit);
        const result = this.handleResults(model, source, tabMode);
        model.setFiltered('result', result);

        /**
         * Admin-view
         */
        const adminView = {
            domains: [],
            layout: [],
            tabs: [],
            displayKicker: [],
            displayPaywall: []
        };

        const tags = [];
        this.api.v1.site.getSites().forEach((site) => {
            if (!site.domain) return;

            let currentDomain = site.domain.replace(/^https?:\/\//, '');
            const selectedSite = !!model.get(`fields.domains_${ site.alias }`);
            const selectedTags = model.get(`fields.tagsSelected`) || '';
            for (let tag of selectedTags.split(",")) {
                tag = tag.trim();
                if (tag && tag.length > 0 && !tags.includes(tag)) {
                    tags.push(tag);
                }

            }

            if (site.domain.includes('labdevs')) {
                currentDomain = this.handleLabdevsDomain(site, currentDomain);
            }

            const current = {
                name: site.display_name,
                alias: site.alias,
                domain: currentDomain,
                selected: selectedSite,
                tags
            };

            adminView.domains.push(current);
        });

        // Defines tab data based on selected tab mode
        let tabSplitData;
        if (tabMode === 'tags') {
            tabSplitData = tags.map((tag) => ({ displayName: tag, domain: tag }));
        } else if (tabMode === 'hostname') {
            tabSplitData = domains.map((domain) => {
                const site = this.api.v1.site.getSites().find((s) => this.getCleanDomain(s.domain) === domain || (s.domain_aliases && s.domain_aliases.includes(domain)));
                return {
                    displayName: site ? site.display_name : domain,
                    domain
                };
            }).filter(Boolean);
        }

        // Set custom tab names if provided in the settings
        const tabNames = model.get('fields.tabsNames') ? model.get('fields.tabsNames').split(',') : [];
        if (tabSplitData) {
            const tabData = tabSplitData.map((item, index) => {
                const customName = tabNames[index] ? tabNames[index].trim() : null;
                return {
                    name: item.displayName,
                    value: customName || item.displayName,
                    domain: item.domain
                };
            });
            model.setFiltered('tabData', tabData);
        }


        // Make current site domain default if none has been selected/checked
        const anySelected = adminView.domains.some((siteData) => siteData.selected === true);
        if (!anySelected) {
            adminView.domains.forEach((site) => {
                if (site.alias === this.api.v1.properties.get('site.alias')) {
                    site.selected = true;
                }
            });
        }

        // Define layout options for the toplist (default is vertical)
        for (const direction of ['horizontal', 'vertical']) {
            adminView.layout.push({
                name: direction,
                value: direction,
                selected: direction === view.get('fields.layout')
            });
        }

        // Define display options for kicker label (default is hidden)
        for (const [paywallVisibility, paywallDescription] of Object.entries({'hideKicker':'Hide', 'aboveTitle': 'Above title', 'rightOfTitle': 'To the right'})) {
            adminView.displayKicker.push({
                name: paywallDescription,
                value: paywallVisibility,
                selected: paywallVisibility === view.get('fields.displayKicker')
            });
        }

        // Define display options for paywall label (default is hidden)
        for (const [paywallVisibility, paywallDescription] of Object.entries({'hidePaywallLabel':'Hide', 'rightOfTitle': 'To the right', 'onImage': 'On the image'})) {
            adminView.displayPaywall.push({
                name: paywallDescription,
                value: paywallVisibility,
                selected: paywallVisibility === view.get('fields.displayPaywall')
            });
        }

        // Define tab mode options (default is single list)
        for (const [splitVariant, splitLabel] of Object.entries({'default':"Single list (default)", 'hostname': "Tab for each site", 'tags': "Tab for each tag"})) {
            adminView.tabs.push({
                name: splitLabel,
                value: splitVariant,
                selected: splitVariant === view.get('fields.tabs')
            });
        }

        // Make data accessible for the admin view
        let splitData = model.get('fields.splitData') || [];
        if (typeof splitData === 'string') {
            try {
                splitData = JSON.parse(splitData);
            } catch (e) {
                splitData = [];
            }
        }

        adminView.splitData = splitData;
        adminView.splitDataJson = JSON.stringify(splitData);
        model.setFiltered('adminView', adminView);
    }

    handleResults(model, source, tabMode) {
        /**
         * Process and format the results from the external data source to be used to render the toplist.
         * @param {Object} model - The model object - the toplist.
         * @param {Object} source - The external data source - a key from kilkaya.
         * @param {string} tabMode - The tab mode, either 'default' or 'multi'.
         */
        const result = [];

        if (!source || !source.data || Object.keys(source.data).length === 0) {
            return result;
        }

        if (!model) {
            return result;
        }

        const displayImages = !!model.get('fields.displayImages');
        model.setFiltered('displayImages', displayImages);

        const displayDate = !model.get('fields.hideDate');

        const dateHelper = new DateTimeHelperInt();
        if (tabMode === 'default') {
            try {
                source.data.forEach((article) => {
                    const outputArticle = this.setOutputData(model, article, dateHelper, displayDate, displayImages);
                    if (outputArticle) {
                        result.push(outputArticle);
                    }
                });
            } catch (error) {
                console.error('Error processing articles:', error);
                model.resetExternalResource();

            }
        } else {
            try {
                for (const key of Object.keys(source.data)) {
                    if (source.data[key] && source.data[key].length > 0) {
                        // Process each site's data
                        source.data[key].forEach((article) => {
                            const outputArticle = this.setOutputData(model, article, dateHelper, displayDate, displayImages, key);
                            if (outputArticle) {
                                result.push(outputArticle);
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing articles:', error);
                model.resetExternalResource();
            }

        }
        return result;
    }

    setOutputData(model, article, dateHelper, displayDate, displayImages, key = null) {
        /**
         * Set output data for each article.
         * Includes both data coming from Kilkaya and internal Labrador data.
         * @param {Object} model - The model object.
         * @param {Object} article - The article data from Kilkaya.
         * @param {DateTimeHelperInt} dateHelper - Instance of DateTimeHelperInt for date formatting.
         * @param {boolean} displayDate - Flag indicating whether to format and include the publication date.
         * @param {boolean} displayImages - Flag indicating whether to include image URLs.
         * @param {string|null} key - Used to identify the source in multi-tab mode, like domain or tag.
         */
        const acceptSite = this.evaluateSiteAndSection(model, article);
        const dateString = article.fields.published || null;

        const displayName = (acceptSite && acceptSite.display_name && acceptSite.display_name.length > 0) ? acceptSite.display_name : null;

        return {
            name: displayName || article.fields.hostname || '',
            title: article.fields.title || '',
            kicker: article.fields.kicker,
            paywall: article.fields.paywall === '1' || article.fields.paywall === 1,
            url: article.fields.published_url || article.fields.srcUrl,
            section: article.fields.section || '',
            tags: article.fields.tag || '',
            domain: article.fields.hostname || '',
            pageviews: article.fields.pageviews,
            published: dateString,
            niceDate: displayDate && dateString ? dateHelper.timestampToNiceDate(
                dateHelper.toTimestamp(
                    new Date(dateString)
                )
            ) : '',
            cssClass: article.fields.cssClass || null,
            imageUrl: displayImages ? this.getImageUrl(model, article.fields.image) : null,
            sourceDomain: article.fields.sourceDomain || article.fields.hostname,
            sourceDisplayName: article.fields.sourceDisplayName || displayName || article.fields.hostname,
            kilkayaKey: key || null
        };
    }

    getPlaceholderData(count) {
        /**
         * Generate placeholder data, used as a preload while waiting for real data
         */
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push({
                fields: {
                    cssClass: 'dac-placeholder-text',
                    type: 'article'
                }
            });
        }
        return { data: result };
    }

    getImageUrl(model, url) {
        /**
         * Generate image URL with specified width and height.
         * Image will be added to the article if displayImages is enabled.
         * @param {Object} model - The model object - the toplist.
         * @param {string} url - The original image URL.
         */
        if (!url) return null;
        const width = model.get(`fields.imageWidth`) || 100;
        const height = model.get(`fields.imageHeight`) || 100;
        let updatedUrl = url.replace(/^https?:\/\//, '//');

        if (updatedUrl.includes('width=') && updatedUrl.includes('height=')) {
            updatedUrl = updatedUrl.replace(/width=\d+/, `width=${ width }`);
            updatedUrl = updatedUrl.replace(/height=\d+/, `height=${ height }`);
        } else {
            updatedUrl += `&width=${ width }&height=${ height }`;
        }

        return updatedUrl;
    }

    evaluateSiteAndSection(model, article) {
        /**
         * Evaluate if the article's site and section are selected in the element settings.
         * @param {Object} model - The model object - the toplist.
         * @param {Object} article - The article data from Kilkaya.
         */

        // First try to find by hostname
        let currentSite = this.api.v1.site.getSites().find((site) =>
            this.getCleanDomain(site.domain) === article.fields.hostname
        );


        // If not found, try domain aliases
        if (!currentSite) {
            for (const s of this.api.v1.site.getSites()) {
                if (s.domain_aliases && s.domain_aliases.length > 0) {
                    const aliases = s.domain_aliases.split('\n').map((alias) => this.getCleanDomain(alias.trim()));
                    if (aliases.includes(article.fields.hostname)) {
                        currentSite = s;
                        break;
                    }
                }
            }
        }

        // If still not found, try by sourceDomain
        if (!currentSite && article.fields.sourceDomain) {
            currentSite = this.api.v1.site.getSites().find((site) =>
                this.getCleanDomain(site.domain) === article.fields.sourceDomain
            );
        }

        if (currentSite) {

            // Check if this site is selected in the element settings
            const siteSelected = model.get(`fields.domains_${ currentSite.alias }`);

            if (!siteSelected) {
                return false;
            }

            const selectedSectionsRaw = model.get(`fields.domains_${ currentSite.alias }_sections`);

            if (!selectedSectionsRaw || selectedSectionsRaw === '') {
                return currentSite;
            }

            const selectedSections = (selectedSectionsRaw || '').split(',').map((section) => section.trim()).filter(Boolean);
            if (selectedSections && selectedSections.length > 0 && selectedSections.includes(article.fields.section)) {
                return currentSite;
            }
        }
        return false;
    }

    getCleanDomain(domain) {
        /**
         * Remove protocol from domain string.
         * @param {string} domain - The domain string.
         */
        if (!domain) return '';
        return domain.replace(/^https?:\/\//, '');
    }

    handleLabdevsDomain(site, domain) {
        /**
         * Special handling for labdevs domain to enable testing with public domains
         * If domain_aliases is set, use the first alias as the current domain
         * You can set a domain alias on Labrador CMS under Site settings > Domain aliases
         */
        let currentDomain = domain;
        if (site.domain_aliases && site.domain_aliases.length > 0) {
            const aliases = site.domain_aliases.split('\n');
            if (aliases.length > 0) {
                currentDomain = this.getCleanDomain(aliases[0]);
            } else {
                currentDomain = site.domain_aliases;
                currentDomain = this.getCleanDomain(site.domain);
            }
        }
        return currentDomain;
    }

}