/**
 * Utility functions for building JSON-LD schema objects
 */

export class SEOSchemaUtils {

    /**
     * Builds author/person schema object
     * @param {Object} byline - The byline model
     * @param {Object} options - Configuration options
     * @param {string} options.imageServer - Image server URL
     * @param {Function} options.shouldUseAuthorPageUrl - Function to check if author page URL should be used
     * @param {Function} options.getAuthorPageUrl - Function to get author page URL
     * @returns {Object} Person schema object
     */
    static buildAuthorSchema(byline, options = {}) {
        const { imageServer = '', shouldUseAuthorPageUrl, getAuthorPageUrl, getImageDimensions } = options;

        let firstname = byline.get('fields.firstname');
        if (firstname === 'Byline first name') { firstname = ''; }
        let lastname = byline.get('fields.lastname');
        if (lastname === 'Byline last name') { lastname = ''; }

        const result = {
            '@type': 'Person',
            name: `${firstname} ${lastname}`
        };

        // Add description
        const description = byline.get('fields.description');
        if (description) {
            result.description = lab_api.v1.util.string.sanitizeString(description);
        }

        // Add job title
        const jobTitle = byline.get('fields.job_title');
        if (jobTitle  && jobTitle !== 'Click to add job title') {
            result.jobTitle = lab_api.v1.util.string.sanitizeString(jobTitle).trim();
        }

        // Use author page URL if enabled, otherwise fall back to public_url
        if (shouldUseAuthorPageUrl && shouldUseAuthorPageUrl(byline)) {
            result.url = getAuthorPageUrl(byline);
        } else {
            const public_url = byline.get('fields.public_url');
            if (public_url) {
                result.url = public_url;
            }
        }

        // Add author image if available
        const images = lab_api.v1.model.query.getChildrenOfType(byline, 'image', true);
        if (images && images.length > 0) {
            const image = images[0];
            const imageurl = image.get('fields.imageurl') || `${imageServer}/?imageId=${image.get('instance_of')}`;
            const finalUrl = imageurl.includes('width=') ? imageurl : `${imageurl}&width=250`;
            result.image = {
                '@type': 'ImageObject',
                url: finalUrl
            };

            // Add calculated dimensions for resized image
            if (getImageDimensions) {
                const dimensions = getImageDimensions(image, 250);
                if (dimensions) {
                    result.image.width = dimensions.width;
                    result.image.height = dimensions.height;
                }
            }
        }

        const public_email = byline.get('fields.public_email');
        if (public_email) {
            result.email = public_email;
        }

        // Add sameAs (alternative URLs for the author)
        try {
            const sameAsLinks = [];
            const public_url = byline.get('fields.public_url');

            if (public_url) {
                sameAsLinks.push(public_url);
            }

            if (sameAsLinks.length > 0) {
                result.sameAs = sameAsLinks;
            }
        } catch (error) {
            // Silently skip sameAs if there's an error
        }

        return result;
    }

    /**
     * Builds publisher organization schema object
     * @returns {Object} Organization schema object
     */
    static buildPublisherSchema(domain = '') {
        const logo = lab_api.v1.config.get('logo') || {};
        const logoMain = logo.mainLogo || {};
        let logoSrc = lab_api.v1.config.get('seoSchema.publisherLogoUrl')
            || logoMain.uploadedFileUrl
            || logo.uploadedFileUrl
            || logoMain.src
            || (logo.default && logo.default.src)
            || '';
        if (logoSrc && !logoSrc.startsWith('http://') && !logoSrc.startsWith('https://')) {
            logoSrc = `${domain}${logoSrc.startsWith('/') ? '' : '/'}${logoSrc}`;
        }
        const logoWidth = lab_api.v1.config.get('logo.logoWidth') || null;
        const logoHeight = lab_api.v1.config.get('logo.logoHeight') || null;
        return {
            '@type': 'Organization',
            name: lab_api.v1.properties.get('site.display_name'),
            url: domain,
            logo: {
                '@type': 'ImageObject',
                url: logoSrc,
                ...(logoWidth && { width: logoWidth }),
                ...(logoHeight && { height: logoHeight })
            }
        };
    }

    /**
     * Builds broadcaster service schema object
     * @returns {Object} BroadcastService schema object
     */
    static buildBroadcasterSchema(domain = '') {
        return {
            '@type': 'BroadcastService',
            name: lab_api.v1.properties.get('site.display_name'),
            broadcaster: SEOSchemaUtils.buildPublisherSchema(domain)
        };
    }

    /**
     * Builds an article list as ItemList schema
     * @param {Array} articles - Array of article models
     * @param {string} imageServer - Image server URL
     * @returns {Object|null} ItemList schema object or null if no articles
     */
    static buildArticleListItemList(articles, imageServer) {
        if (!articles || articles.length === 0) {
            return null;
        }

        return {
            '@type': 'ItemList',
            itemListElement: articles.map((article, index) => {
                const item = {
                    '@type': 'NewsArticle',
                    headline: article.get('fields.title'),
                    url: article.get('fields.published_url') || article.get('fields.url')
                };

                // Add image if available - check someimage first (front/teaser image), then first child image
                const someimage = article.get('fields.someimage');
                if (someimage) {
                    item.image = `${imageServer}/${someimage}.webp?width=1200&height=630`;
                } else {
                    const images = lab_api.v1.model.query.getChildrenOfType(article, 'image', true);
                    if (images && images.length > 0) {
                        const firstImage = images[0];
                        let imageurl = firstImage.get('fields.imageurl') || `${imageServer}/?imageId=${firstImage.get('instance_of')}`;
                        // Ensure width parameter is set
                        if (imageurl.includes('width=')) {
                            // Already has width, keep as is
                            item.image = imageurl;
                        } else if (imageurl.includes('?')) {
                            // Has query params, add width
                            item.image = `${imageurl}&width=1200`;
                        } else {
                            // No query params, add width
                            item.image = `${imageurl}?width=1200`;
                        }
                    }
                }

                return {
                    '@type': 'ListItem',
                    position: index + 1,
                    item
                };
            })
        };
    }

    /**
     * Builds an article list as hasPart schema
     * @param {Array} articles - Array of article models
     * @param {string} imageServer - Image server URL
     * @returns {Array|null} Array of NewsArticle objects or null if no articles
     */
    static buildArticleListHasPart(articles, imageServer) {
        if (!articles || articles.length === 0) {
            return null;
        }

        return articles.map((article) => {
            const item = {
                '@type': 'NewsArticle',
                headline: article.get('fields.title'),
                url: article.get('fields.published_url') || article.get('fields.url')
            };

            // Add image if available - check someimage first (front/teaser image), then first child image
            const someimage = article.get('fields.someimage');
            if (someimage) {
                item.image = `${imageServer}/${someimage}.webp?width=1200&height=630`;
            } else {
                const images = lab_api.v1.model.query.getChildrenOfType(article, 'image', true);
                if (images && images.length > 0) {
                    const firstImage = images[0];
                    const imageurl = firstImage.get('fields.imageurl') || `${imageServer}/?imageId=${firstImage.get('instance_of')}`;
                    item.image = imageurl.endsWith('width=') ? `${imageurl}1200` : `${imageurl}&width=1200`;
                }
            }

            return item;
        });
    }
}
