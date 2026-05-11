import { SEOSchemaUtils } from './SEOSchemaUtils.js';

export class SEOHelper {

    constructor({
        pageType = '',
        canonical = '',
        isTagpage = false,
        isTagpageWithFrontpage = false,
        tagpagePath = '/tag/',
        publishedUrl = ''
    } = {}) {
        this.settings = {
            pageType,
            canonical,
            isTagpage,
            isTagpageWithFrontpage,
            tagpagePath,
            publishedUrl
        };
        this.cache = {
            seoData: null
        };
        this.imageServer = lab_api.v1.properties.get('image_server');
        this.domain = lab_api.v1.site.getSite().domain || lab_api.v1.properties.get('customer_front_url');
        this.authorPagesConfig = lab_api.v1.config.get('authorPages') || {};
    }

    /**
     * Generates and returns JSON-LD data based on configurations and page type.
     *
     * @param {LabModel} model The data model of the current node.
     * @returns Structured JSON-LD data.
     */
    getStructuredData(model) {
        if (model.get('fields.jsonld_json')) {
            return model.get('fields.custom_jsonld');
        }
        if (this.settings.pageType === 'front') {
            return this.generateFrontData(model);
        }
        if (this.settings.pageType === 'gallery') {
            return this.generateGalleryPageData(model);
        }
        if (this.settings.pageType === 'article' || this.settings.pageType === 'notice') {
            const schemaType = model.get('fields.seoschematype') || 'NewsArticle';

            // Special schema types that can be paired with articles
            // Note: Recipe block generates detailed Recipe schema; this just creates the page wrapper
            const specialSchemas = ['ImageGallery', 'VideoObject', 'BroadcastEvent', 'LiveBlogPosting', 'Recipe'];
            const requiresArticle = [];

            if (specialSchemas.includes(schemaType)) {
                let specialSchemaData = null;

                // Generate the special schema
                if (schemaType === 'ImageGallery') {
                    specialSchemaData = this.generateImageGalleryData(model);
                } else if (schemaType === 'VideoObject') {
                    specialSchemaData = this.generateVideoObjectData(model);
                } else if (schemaType === 'BroadcastEvent') {
                    specialSchemaData = this.generateBroadcastEventData(model);
                } else if (schemaType === 'LiveBlogPosting') {
                    specialSchemaData = this.generateArticleData(model);
                } else if (schemaType === 'Recipe') {
                    specialSchemaData = this.generateRecipeData(model);
                }

                if (!specialSchemaData) {
                    return null;
                }

                // Include NewsArticle for types that require it (ImageGallery, BroadcastEvent, LiveBlogPosting)
                // VideoObject and Recipe are standalone
                if (requiresArticle.includes(schemaType)) {
                    const articleData = this.generateArticleData(model);
                    // generateArticleData now normalizes non-article types to NewsArticle automatically
                    // Remove mainEntityOfPage from article since the special schema has it
                    delete articleData.mainEntityOfPage;
                    return [articleData, specialSchemaData];
                }

                // Return standalone special schema (VideoObject and Recipe)
                return specialSchemaData;
            }

            // For all other types (NewsArticle, Article, OpinionNewsArticle)
            return this.generateArticleData(model);
        }
        return null;
    }

    generateSiteData(model) {
        return {
            '@context': 'http://schema.org',
            '@type': 'WebSite',
            name: lab_api.v1.properties.get('site.display_name'),
            url: lab_api.v1.properties.get('site.domain') || ''
            /*
            sameAs: [
                'https://facebook.com/mypage',
                'https://instagram.com/site',
                'https://twitter.com/name'
            ],
            potentialAction: {
            '@type': 'SearchAction',
            'target': 'http://example.com/pages/search_results?q={search_term}',
            'query-input': 'required name=search_term'
            }
            */
        };
    }

    getPublisherObject() {
        return SEOSchemaUtils.buildPublisherSchema(this.domain);
    }

    getBroadcasterObject() {
        return SEOSchemaUtils.buildBroadcasterSchema(this.domain);
    }

    /**
     * Get article images, optionally excluding images from specified parent types
     * @param {Object} model - The article model
     * @param {Array<string>} excludedParentTypes - Array of parent types to exclude (e.g., ['byline'])
     * @returns {Array} Filtered array of image nodes
     */
    getArticleImages(model, excludedParentTypes = []) {
        const allImages = lab_api.v1.model.query.getChildrenOfType(model, 'image', true);

        if (excludedParentTypes.length === 0) {
            return allImages;
        }

        // Collect IDs of images to exclude based on parent types
        const excludedImageIds = new Set();
        excludedParentTypes.forEach((parentType) => {
            const parents = lab_api.v1.model.query.getChildrenOfType(model, parentType, true);
            parents.forEach((parent) => {
                const images = lab_api.v1.model.query.getChildrenOfType(parent, 'image', true);
                images.forEach((img) => excludedImageIds.add(img.get('instance_of')));
            });
        });

        return allImages.filter((image) => !excludedImageIds.has(image.get('instance_of')));
    }

    /**
     * Calculate word count from HTML text
     * @param {string} htmlText - The HTML text to count words from
     * @returns {number} Word count
     */
    calculateWordCount(htmlText) {
        if (!htmlText) {
            return 0;
        }
        // Strip HTML tags and count words
        const plainText = lab_api.v1.util.string.stripTags(htmlText);
        const words = plainText.trim().split(/\s+/).filter((word) => word.length > 0);
        return words.length;
    }

    /**
     * Calculate reading time in ISO 8601 duration format
     * @param {number} wordCount - Number of words
     * @returns {string} Duration in ISO 8601 format (e.g., "PT5M" for 5 minutes)
     */
    calculateTimeRequired(wordCount) {
        if (!wordCount || wordCount === 0) {
            return 'PT1M';
        }
        // Average reading speed: 200 words per minute
        const minutes = Math.ceil(wordCount / 200);
        return `PT${ minutes }M`;
    }

    /**
     * Calculate resized image dimensions maintaining aspect ratio
     * @param {Object} image - Image model
     * @param {number} targetWidth - Desired width
     * @returns {Object} {width, height} or null if ratio unavailable
     */
    getImageDimensions(image, targetWidth) {
        let whRatio = parseFloat(image.get('fields.whRatio'));

        // Fallback: calculate from originalWidth/originalHeight if whRatio not available
        if (!whRatio || isNaN(whRatio)) {
            const originalWidth = parseInt(image.get('fields.originalWidth'), 10);
            const originalHeight = parseInt(image.get('fields.originalHeight'), 10);

            if (originalWidth && originalHeight && originalWidth > 0) {
                whRatio = originalHeight / originalWidth;
            } else {
                return null;
            }
        }

        // whRatio = height / width, so targetHeight = targetWidth * whRatio
        return {
            width: targetWidth,
            height: Math.round(targetWidth * whRatio)
        };
    }

    /**
     * Build ImageObject array from article images for use in JSON-LD schemas
     * @param {Object} model - Article model
     * @returns {Array} Array of ImageObject schema objects
     */
    buildArticleImageObjects(model) {
        const images = this.getArticleImages(model, ['byline']);
        const result = images.map((image, index) => {
            const imageurl = image.get('fields.imageurl') || `${ this.imageServer }/?imageId=${ image.get('instance_of') }`;
            const url = imageurl.endsWith('width=') ? `${ imageurl }1200` : `${ imageurl }&width=1200`;
            const dimensions = this.getImageDimensions(image, 1200);
            const imageObject = {
                '@type': 'ImageObject',
                url
            };

            if (index === 0) {
                imageObject['@id'] = `${ this.settings.publishedUrl }#primaryimage`;
            }

            if (dimensions) {
                imageObject.width = dimensions.width;
                imageObject.height = dimensions.height;
            }

            return imageObject;
        });

        if (result.length === 0) {
            const frontCrop = model.get('frontCrop');
            const fcInstanceOf = frontCrop && frontCrop.pano && frontCrop.pano.instance_of;
            if (fcInstanceOf) {
                return [{
                    '@type': 'ImageObject',
                    '@id': `${ this.settings.publishedUrl }#primaryimage`,
                    url: `${ this.imageServer }/${ fcInstanceOf }.webp?width=1200`
                }];
            }
        }

        return result;
    }

    /**
     * Determines whether the author should have an author page URL in the schema
     * @param {Object} byline - The byline model
     * @returns {boolean} True if author page should be used
     */
    shouldUseAuthorPageUrl(byline) {
        const fields = {
            public_email: byline.get('fields.public_email'),
            email: byline.get('fields.email')
        };
        const instanceOf = byline.get('instance_of');

        if (this.authorPagesConfig.enabled && (fields.public_email || fields.email) && instanceOf) {
            if (this.authorPagesConfig.enableForAll) {
                return true;
            }
            if (this.authorPagesConfig.enabledAuthorIds) {
                const enabledIds = this.authorPagesConfig.enabledAuthorIds.split(',').map((id) => parseInt(id.trim(), 10));
                if (enabledIds.includes(instanceOf)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Builds the author page URL
     * @param {Object} byline - The byline model
     * @returns {string} The author page URL
     */
    getAuthorPageUrl(byline) {
        const instanceOfId = byline.get('instance_of');
        const instanceOfJson = byline.get('instance_of_json') ? JSON.parse(byline.get('instance_of_json')) : undefined;
        const instanceOfSlug = (instanceOfJson && instanceOfJson.fields && instanceOfJson.fields.slug) ? instanceOfJson.fields.slug : undefined;

        return `${ this.domain }/${ this.authorPagesConfig.path || 'author' }/${ instanceOfSlug || instanceOfId || '' }`;
    }

    buildArticleListItemList(articles) {
        return SEOSchemaUtils.buildArticleListItemList(articles, this.imageServer);
    }

    buildArticleListHasPart(articles) {
        return SEOSchemaUtils.buildArticleListHasPart(articles, this.imageServer);
    }

    /**
     * Determines the correct article schema type
     * @param {LabModel} model - The article model
     * @returns {string} The normalized article schema type (NewsArticle, Article, OpinionNewsArticle, or LiveBlogPosting)
     */
    getArticleSchemaType(model) {
        const schemaType = model.get('fields.seoschematype') || 'NewsArticle';

        // Valid article schema types that can be used directly
        const validArticleTypes = ['NewsArticle', 'Article', 'OpinionNewsArticle', 'LiveBlogPosting'];

        // Normalize non-article types to NewsArticle (ImageGallery, BroadcastEvent, Recipe, etc)
        if (!validArticleTypes.includes(schemaType)) {
            return 'NewsArticle';
        }

        return schemaType;
    }

    generateFrontData(model) {
        const seoData = this.getSEOData(model);

        // Use CollectionPage for tag pages
        if (this.settings.isTagpage) {
            const output = {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                url: this.settings.publishedUrl,
                name: seoData.title,
                description: seoData.description
            };

            // Try to get article list if available
            const articles = lab_api.v1.model.query.getChildrenOfType(model, 'article', true);
            const mainEntity = this.buildArticleListItemList(articles);
            if (mainEntity) {
                output.mainEntity = mainEntity;
            }

            return output;
        }

        // All other front pages - WebPage with automatic article lists
        const output = {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            url: this.settings.publishedUrl,
            name: seoData.title,
            description: seoData.description,
            publisher: this.getPublisherObject()
        };

        // Add article lists if articles exist
        const articles = lab_api.v1.model.query.getChildrenOfType(model, 'article', true);
        const mainEntity = this.buildArticleListItemList(articles);
        if (mainEntity) {
            output.mainEntity = mainEntity;
            output.hasPart = this.buildArticleListHasPart(articles);
        }

        return output;
    }

    generateArticleData(model) {
        const seoData = this.getSEOData(model);
        const schemaType = this.getArticleSchemaType(model);

        // Get article images, excluding images from bylines
        const images = this.getArticleImages(model, ['byline']);

        // Check if extended schema is enabled
        const extendedSchema = lab_api.v1.config.get('extendedSeoSchema.active');

        const output = {
            '@context': 'https://schema.org',
            '@type': schemaType,
            headline: seoData.title || model.get('fields.title'),
            description: seoData.description,
            url: this.settings.publishedUrl,
            inLanguage: [
                {
                    '@type': 'Language',
                    alternateName: seoData.language
                }
            ],
            image: this.buildArticleImageObjects(model),
            keywords: (model.get('tags') || []).join(', ')
        };

        // Add thumbnailUrl - use someimage if available, otherwise use first image, then frontcrop as fallback
        const someimage = model.get('fields.someimage');
        if (someimage) {
            output.thumbnailUrl = `${ this.imageServer }/${ someimage }.webp?width=400`;
        } else if (images && images.length > 0) {
            const firstImage = images[0];
            const imageurl = firstImage.get('fields.imageurl') || `${ this.imageServer }/?imageId=${ firstImage.get('instance_of') }`;
            // Replace existing width parameter or add new one
            if (imageurl.includes('width=')) {
                output.thumbnailUrl = imageurl.replace(/width=\d*/, 'width=400');
            } else if (imageurl.includes('?')) {
                output.thumbnailUrl = `${ imageurl }&width=400`;
            } else {
                output.thumbnailUrl = `${ imageurl }?width=400`;
            }
        } else {
            const frontCrop = model.get('frontCrop');
            const fcInstanceOf = frontCrop && frontCrop.pano && frontCrop.pano.instance_of;
            if (fcInstanceOf) {
                output.thumbnailUrl = `${ this.imageServer }/${ fcInstanceOf }.webp?width=400`;
            }
        }

        // Add articleSection if available
        const contentdata = model.data && model.data.contentdata;
        let section;
        if (model.get('fields.subsection')) {
            section = (contentdata && contentdata.term && contentdata.term.section && contentdata.term.section[0] && contentdata.term.section[0].displayName)
                || model.get('fields.subsection');
        } else {
            section = (contentdata && contentdata.mainterm && contentdata.mainterm.section && contentdata.mainterm.section[0] && contentdata.mainterm.section[0].displayName)
                || model.get('primaryTags.section') || model.get('fields.defaultsection');
        }
        if (section) {
            output.articleSection = section;
        }

        // Add @id only if extended schema is enabled
        if (extendedSchema) {
            output['@id'] = schemaType === 'LiveBlogPosting'
                ? `#${ schemaType.toLowerCase() }`
                : `${ this.settings.publishedUrl }#${ schemaType.toLowerCase() }`;
        }

        // Add authors
        output.author = lab_api.v1.model.query.getChildrenOfType(model, 'byline', true).map((byline) => SEOSchemaUtils.buildAuthorSchema(byline, {
            imageServer: this.imageServer,
            shouldUseAuthorPageUrl: this.shouldUseAuthorPageUrl.bind(this),
            getAuthorPageUrl: this.getAuthorPageUrl.bind(this),
            getImageDimensions: this.getImageDimensions.bind(this)
        }));

        // Add publisher
        output.publisher = this.getPublisherObject();

        // Set mainEntityOfPage for articles
        output.mainEntityOfPage = this.settings.publishedUrl;

        // Add mainEntity only if extended schema is enabled
        if (extendedSchema) {
            output.mainEntity = {
                '@type': 'WebPage',
                '@id': this.settings.publishedUrl
            };
        }

        if (model.get('fields.published')) {
            output.datePublished = new Date(parseInt(model.get('fields.published'), 10) * 1000).toISOString();
        }

        if (model.get('fields.modified')) {
            output.dateModified = new Date(parseInt(model.get('fields.modified'), 10) * 1000).toISOString();
        }

        if (model.get('fields.paywall') === '1') {
            output.isAccessibleForFree = false;
            output.hasPart = {
                '@type': 'WebPageElement',
                isAccessibleForFree: true,
                cssSelector: '.teaserContent'
            };
        } else {
            output.isAccessibleForFree = true;
        }

        // Add extended schema fields if enabled
        if (extendedSchema) {
            try {
                const bodytext = model.get('fields.bodytext');
                const isPaywalled = model.get('fields.paywall') === '1';

                // Add articleBody only if not paywalled
                if (bodytext && !isPaywalled) {
                    output.articleBody = lab_api.v1.util.string.stripTags(bodytext);
                }

                // Calculate and add word count
                if (bodytext) {
                    const wordCount = this.calculateWordCount(bodytext);
                    if (wordCount > 0) {
                        output.wordCount = wordCount;
                        output.timeRequired = this.calculateTimeRequired(wordCount);
                    }
                }

                // Add editor information if available
                const editors = lab_api.v1.model.query.getChildrenOfType(model, 'editor', true);
                if (editors && editors.length > 0) {
                    output.editor = editors.map((editor) => {
                        let firstname = editor.get('fields.firstname') || '';
                        let lastname = editor.get('fields.lastname') || '';
                        if (firstname === 'Editor first name') firstname = '';
                        if (lastname === 'Editor last name') lastname = '';

                        const editorResult = {
                            '@type': 'Person',
                            name: `${ firstname } ${ lastname }`.trim()
                        };

                        const description = editor.get('fields.description');
                        if (description) {
                            editorResult.description = lab_api.v1.util.string.sanitizeString(description);
                        }

                        const public_url = editor.get('fields.public_url');
                        if (public_url) {
                            editorResult.url = public_url;
                        }

                        const image = (editor.children || []).filter((child) => child.type === 'image')[0];
                        if (image) {
                            editorResult.image = {
                                '@type': 'ImageObject',
                                url: `${ image.get('fields.imageurl') }&width=250`
                            };

                            // Add calculated dimensions for resized image
                            const dimensions = this.getImageDimensions(image, 250);
                            if (dimensions) {
                                editorResult.image.width = dimensions.width;
                                editorResult.image.height = dimensions.height;
                            }
                        }

                        return editorResult;
                    });
                }
            } catch (error) {
                // Extended schema failed — continue with base schema
            }
        }

        // Add coverageStartTime for LiveBlogPosting
        if (schemaType === 'LiveBlogPosting') {
            if (model.get('fields.published')) {
                output.coverageStartTime = new Date(parseInt(model.get('fields.published'), 10) * 1000).toISOString();
            }
        }

        return output;
    }

    /**
     * Returns SEO data such as Title and Description for a frontpage or article.
     * Method may be called several times, uses cache.
     *
     * @param {model} model The data model of the current node.
     * @returns {Object} SEO title and description of the current page.
     */
    getSEOData(model) {
        if (this.cache.seoData) { return this.cache.seoData; }
        let language;
        let title;
        let description;
        if (this.settings.pageType === 'article' || this.settings.pageType === 'notice') {
            title = lab_api.v1.util.string.sanitizeString(model.get('fields.seotitle') || model.get('fields.title') || '');
            description = lab_api.v1.util.string.sanitizeString(model.get('fields.seodescription') || model.get('fields.subtitle') || '');
            language = model.get('fields.seolanguage') || lab_api.v1.config.get('contentLanguage');
        } else if (this.settings.pageType === 'gallery') {
            // Gallery pages compose their title/description in Gallery.js onReady,
            // writing the result onto filtered.seotitle / filtered.seodescription.
            title = lab_api.v1.util.string.sanitizeString(model.get('filtered.seotitle') || '');
            description = lab_api.v1.util.string.sanitizeString(model.get('filtered.seodescription') || '');
            language = lab_api.v1.config.get('contentLanguage');
        } else {
            if (this.settings.isTagpage && !this.settings.isTagpageWithFrontpage) {

                // Term compatibility: Use term displayName for proper-cased SEO titles
                // (e.g., "Sports" instead of "sports" for better presentation)
                const tagsAsTerms = lab_api.v1.properties.get('tags_as_terms');

                // Extract URL segments (needed for backward compatibility with locale templates)
                const tagsString = this.settings.canonical.split(this.settings.tagpagePath)[1] || '';
                const urlSegments = tagsString.split('/').filter((item) => !!item);

                let tag = urlSegments[urlSegments.length - 1] || '';

                // When terms are active, use displayName for tag (for proper-cased titles)
                if (tagsAsTerms) {
                    // Get term data from contentdata.mainterm
                    let mainterm = null;
                    if (model.data && model.data.contentdata) {
                        mainterm = model.data.contentdata.mainterm;
                    }

                    // Use term displayName if available
                    if (mainterm && mainterm.section && mainterm.section.displayName) {
                        tag = mainterm.section.displayName;
                    }
                }

                // Data for mustache-template
                const data = {
                    tag,  // Display name when terms active, URL segment otherwise
                    tags: urlSegments,  // Full URL path segments (for breadcrumbs/joining)
                    tagPath: this.settings.tagpagePath.replace(/\//g, '')
                };

                // Get the template from locale and render with tagPath and tag from data
                title = lab_api.v1.locale.get('tags.title_text', {
                    data
                });

            } else {
                title = lab_api.v1.util.string.sanitizeString(model.get('fields.seotitle') || model.get('fields.name') || '');
            }
            description = lab_api.v1.util.string.sanitizeString(model.get('fields.seodescription') || '');
        }

        this.cache.seoData = {
            title: title.charAt(0).toUpperCase() + title.slice(1),
            description,
            language
        };
        return this.cache.seoData;
    }

    /**
     * Build ImageObject array for a gallery/slideshow. Shared between
     * generateImageGalleryData (article-embedded gallery schema) and
     * generateGalleryPageData (standalone gallery pages).
     *
     * @param {Array} images Array of image models
     * @returns {Array} Array of ImageObject schema entries
     */
    buildGalleryImageObjects(images) {
        return (images || []).map((image) => {
            const imageurl = image.get('fields.imageurl') || `${ this.imageServer }/?imageId=${ image.get('instance_of') }`;
            // Three cases: existing width= gets replaced, URL with query gets &-appended,
            // URL without query gets ?-appended. Matches the pattern used in
            // generateArticleData for thumbnailUrl.
            let url;
            if (imageurl.includes('width=')) {
                url = imageurl.replace(/width=\d*/, 'width=1200');
            } else if (imageurl.includes('?')) {
                url = `${ imageurl }&width=1200`;
            } else {
                url = `${ imageurl }?width=1200`;
            }

            const mediaObject = {
                '@type': 'ImageObject',
                contentUrl: url
            };

            const dimensions = this.getImageDimensions(image, 1200);
            if (dimensions) {
                mediaObject.width = dimensions.width;
                mediaObject.height = dimensions.height;
            }

            const caption = image.get('fields.caption');
            if (caption) {
                mediaObject.caption = lab_api.v1.util.string.sanitizeString(caption);
            }

            const photographer = image.get('fields.photographer');
            if (photographer) {
                mediaObject.author = {
                    '@type': 'Person',
                    name: lab_api.v1.util.string.sanitizeString(photographer)
                };
            }

            return mediaObject;
        });
    }

    generateImageGalleryData(model) {
        const firstGallery = lab_api.v1.model.query.getChildrenOfType(model, 'slideshow', true)[0];

        const seoData = this.getSEOData(model);
        const images = this.getArticleImages(model, ['byline']) || [];

        if (!firstGallery && images.length === 0) {
            return null;
        }

        const output = {
            '@context': 'https://schema.org',
            '@type': 'ImageGallery',
            '@id': `${ this.settings.publishedUrl }#gallery`,
            url: this.settings.publishedUrl,
            name: seoData.title,
            description: (firstGallery && firstGallery.get('fields.description')) || model.get('fields.subtitle') || seoData.description,
            mainEntityOfPage: this.settings.publishedUrl,
            image: this.buildGalleryImageObjects(images)
        };

        // Add authors from article bylines
        output.author = lab_api.v1.model.query.getChildrenOfType(model, 'byline', true).map((byline) => SEOSchemaUtils.buildAuthorSchema(byline, {
            imageServer: this.imageServer,
            shouldUseAuthorPageUrl: this.shouldUseAuthorPageUrl.bind(this),
            getAuthorPageUrl: this.getAuthorPageUrl.bind(this),
            getImageDimensions: this.getImageDimensions.bind(this)
        }));

        // Add datePublished from article
        if (model.get('fields.published')) {
            output.datePublished = new Date(parseInt(model.get('fields.published'), 10) * 1000).toISOString();
        }

        // Add publisher
        output.publisher = this.getPublisherObject();

        return output;
    }

    /**
     * Generate structured data for a dedicated gallery page.
     * Emits an ImageGallery schema. When the gallery has an article parent,
     * adds isPartOf + datePublished + dateModified from the parent article.
     *
     * @param {LabModel} model The gallery page node.
     * @returns {Object|null} ImageGallery schema or null if no slideshow found.
     */
    generateGalleryPageData(model) {
        const slideshow = lab_api.v1.model.query.getChildOfType(model, 'slideshow');
        if (!slideshow) {
            return null;
        }

        const images = lab_api.v1.model.query.getChildrenOfType(slideshow, 'image', true) || [];

        // Go through getSEOData so name/description are sanitized the same way
        // as the article/notice/front paths. Reading filtered.* directly would
        // skip the sanitizer and could let HTML or </script>-like sequences
        // leak into the JSON-LD payload.
        const seoData = this.getSEOData(model);
        const name = seoData.title || model.get('filtered.title') || '';
        const description = seoData.description || '';

        const output = {
            '@context': 'https://schema.org',
            '@type': 'ImageGallery',
            '@id': `${ this.settings.publishedUrl }#gallery`,
            url: this.settings.publishedUrl,
            name,
            numberOfItems: images.length,
            image: this.buildGalleryImageObjects(images),
            mainEntityOfPage: this.settings.publishedUrl,
            publisher: this.getPublisherObject()
        };

        if (description) {
            output.description = description;
        }

        // isPartOf + dates only make sense when parent is an article — a
        // front's "published"/"modified" timestamps aren't article-like and
        // would be misleading on an ImageGallery.
        const parentType  = model.get('fields.parent_node_type');
        const parentUrl   = model.get('fields.parent_node_published_url');
        const parentTitle = model.get('fields.parent_node_title');
        if (parentType === 'article' && parentUrl) {
            const absoluteParentUrl = parentUrl.startsWith('http') ? parentUrl : `${ this.domain }${ parentUrl }`;
            output.isPartOf = {
                '@type': 'NewsArticle',
                '@id': `${ absoluteParentUrl }#newsarticle`,
                headline: parentTitle || '',
                url: absoluteParentUrl
            };

            const parentPublished = model.get('fields.parent_node_published');
            const parentModified  = model.get('fields.parent_node_modified');
            if (parentPublished) {
                output.datePublished = new Date(parseInt(parentPublished, 10) * 1000).toISOString();
            }
            if (parentModified) {
                output.dateModified = new Date(parseInt(parentModified, 10) * 1000).toISOString();
            }
        }

        return output;
    }

    getFirstVideoWithProperties(model) {
        const firstVideo = lab_api.v1.model.query.getChildrenOfType(model, 'youtube', true)[0]
                           || lab_api.v1.model.query.getChildrenOfType(model, 'vimond', true)[0]
                           || lab_api.v1.model.query.getChildrenOfType(model, 'vp', true)[0]
                           || lab_api.v1.model.query.getChildrenOfType(model, 'jwplayer', true)[0];

        if (!firstVideo) {
            return null;
        }

        const videoType = firstVideo.getType();
        const properties = {};

        // YouTube-specific properties
        if (videoType === 'youtube') {
            const videoId = firstVideo.get('fields.vid');
            if (videoId) {
                properties.thumbnailUrl = `https://img.youtube.com/vi/${ videoId }/maxresdefault.jpg`;
                properties.embedUrl = `https://www.youtube-nocookie.com/embed/${ videoId }`;
                properties.contentUrl = `https://www.youtube.com/watch?v=${ videoId }`;
            }
        }
        // Vimond and VP-specific properties (both use playerUrl)
        else if (videoType === 'vimond' || videoType === 'vp') {
            const playerUrl = firstVideo.get('fields.playerUrl');
            if (playerUrl) {
                properties.embedUrl = playerUrl;
            }
        }
        // JWPlayer-specific properties
        else if (videoType === 'jwplayer') {
            const mediaId = firstVideo.get('fields.mediaId');
            if (mediaId) {
                properties.contentUrl = mediaId;
            }
        }

        return {
            video: firstVideo,
            type: videoType,
            properties
        };
    }

    generateVideoObjectData(model) {
        const videoData = this.getFirstVideoWithProperties(model);
        if (!videoData) {
            return null;
        }

        const seoData = this.getSEOData(model);
        const { video, properties } = videoData;

        const output = {
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            '@id': `${ this.settings.publishedUrl }#video`,
            name: seoData.title || model.get('fields.title'),
            description: model.get('fields.subtitle') || video.get('fields.caption') || seoData.description,
            mainEntityOfPage: this.settings.publishedUrl
        };

        // Add publisher
        output.publisher = this.getPublisherObject();

        // Add authors
        output.author = lab_api.v1.model.query.getChildrenOfType(model, 'byline', true).map((byline) => SEOSchemaUtils.buildAuthorSchema(byline, {
            imageServer: this.imageServer,
            shouldUseAuthorPageUrl: this.shouldUseAuthorPageUrl.bind(this),
            getAuthorPageUrl: this.getAuthorPageUrl.bind(this),
            getImageDimensions: this.getImageDimensions.bind(this)
        }));

        // Add uploadDate from article's published date
        if (model.get('fields.published')) {
            output.uploadDate = new Date(parseInt(model.get('fields.published'), 10) * 1000).toISOString();
        }

        // Add video-specific properties
        if (properties.thumbnailUrl) {
            output.thumbnailUrl = [properties.thumbnailUrl];
        }
        if (properties.embedUrl) {
            output.embedUrl = properties.embedUrl;
        }
        if (properties.contentUrl) {
            output.url = properties.contentUrl;
        }

        // Add article images as ImageObjects
        const articleImages = this.buildArticleImageObjects(model);
        if (articleImages.length > 0) {
            output.image = articleImages;
        }

        return output;
    }

    generateBroadcastEventData(model) {
        const videoData = this.getFirstVideoWithProperties(model);
        if (!videoData) {
            return null;
        }

        const seoData = this.getSEOData(model);
        const { video, properties } = videoData;

        // Create VideoObject for the broadcast
        const videoObject = {
            '@type': 'VideoObject',
            name: video.get('fields.caption') || seoData.title || model.get('fields.title'),
            description: video.get('fields.caption') || seoData.description
        };

        // Add uploadDate from article's published date
        if (model.get('fields.published')) {
            videoObject.uploadDate = new Date(parseInt(model.get('fields.published'), 10) * 1000).toISOString();
        }

        if (properties.thumbnailUrl) {
            videoObject.thumbnailUrl = properties.thumbnailUrl;
        }
        if (properties.embedUrl) {
            videoObject.embedUrl = properties.embedUrl;
        }
        if (properties.contentUrl) {
            videoObject.contentUrl = properties.contentUrl;
        }

        // Create BroadcastEvent with proper structure
        const broadcastEvent = {
            '@context': 'https://schema.org',
            '@type': 'BroadcastEvent',
            '@id': `${ this.settings.publishedUrl }#broadcast`,
            name: seoData.title || model.get('fields.title'),
            description: model.get('fields.subtitle') || seoData.description,
            mainEntityOfPage: this.settings.publishedUrl,
            isLiveBroadcast: true,
            videoFormat: 'HD'
        };

        // Add startDate from article's published date
        if (model.get('fields.published')) {
            broadcastEvent.startDate = new Date(parseInt(model.get('fields.published'), 10) * 1000).toISOString();
        }

        // Add publishedOn (BroadcastService)
        broadcastEvent.publishedOn = this.getBroadcasterObject();

        // Add authors to the VideoObject (VideoObject is a CreativeWork, author is valid there)
        const bylines = lab_api.v1.model.query.getChildrenOfType(model, 'byline', true);
        if (bylines && bylines.length > 0) {
            videoObject.author = bylines.map((byline) => SEOSchemaUtils.buildAuthorSchema(byline, {
                imageServer: this.imageServer,
                shouldUseAuthorPageUrl: (b) => this.shouldUseAuthorPageUrl(b),
                getAuthorPageUrl: (b) => this.getAuthorPageUrl(b),
                getImageDimensions: (image, width) => this.getImageDimensions(image, width)
            }));
        }

        // Add the VideoObject as workPerformed
        broadcastEvent.workPerformed = videoObject;

        // Return standalone BroadcastEvent
        return broadcastEvent;
    }

    generateRecipeData(model) {
        const firstRecipe = lab_api.v1.model.query.getChildrenOfType(model, 'recipe', true)[0];
        if (!firstRecipe) {
            return null;
        }

        const recipeGuid = firstRecipe.get('guid');
        const seoData = this.getSEOData(model);

        // Recipe block generates full Recipe JSON-LD schema with unique @id
        // Header only provides WebPage wrapper that references the recipe as main entity
        const output = {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            url: this.settings.publishedUrl,
            name: seoData.title || model.get('fields.title'),
            description: seoData.description,
            mainEntity: {
                '@type': 'Recipe',
                '@id': `${ this.settings.publishedUrl }#recipe-${ recipeGuid }`
            }
        };

        // Add publisher
        output.publisher = this.getPublisherObject();

        return output;
    }

}
