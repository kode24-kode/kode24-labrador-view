export default class Byline {

    constructor(api) {
        this.api = api;
        this.domain = this.api.v1.site.getSite().domain || this.api.v1.properties.get('customer_front_url');
        this.authorPagesConfig = this.api.v1.config.get('authorPages') || {};
    }

    onId(model) {
        // Store added bylines on the user-object.
        // Can be used to display frequently used bylines in the byline-collection
        const current = lab_api.v1.user.getField('favouriteBylineIds') || [];
        const id = model.get('instance_of');
        if (!id || current.includes(id)) {
            return;
        }
        current.unshift(id);
        lab_api.v1.user.setField('favouriteBylineIds', current.slice(0, 5));
    }

    // Lab 3 may set fields.width for byline-images if main image is in full-width. Fix.
    onReady(model, view) {
        const image = this.api.v1.model.query.getChildOfType(model, 'image');
        if (!image) { return; }
        if (!image.get('fields.width')) { return; }
        image.set('fields.width', null, {
            save: false,
            undoable: false
        });
    }

    onRender(model, view) {
        // Config defines what elements and order of elements to display in the byline.
        /*
        Config-example:
        {
            "template": [{
                "key": "image"
            }, {
                "key": "firstname",
                "url": "public_email"
            }, {
                "key": "lastname",
                "url": "public_email"
            }, {
                "key": "description"
            }],
            "imageAbove": true,
            "imageBelow": false
        }
        */

        const isEditMode = this.api.v1.app.mode.isEditor();
        const config = this.api.v1.config.get('contentbox_settings.byline') || {};
        const template = config.template || [];
        const fields = {
            public_email: view.get('fields.public_email'),
            public_url: view.get('fields.public_url'),
            email: view.get('fields.email'),
            public_phone: view.get('fields.public_phone'),
            firstname: view.get('fields.firstname'),
            lastname: view.get('fields.lastname'),
            description: view.get('fields.description'),
            description2: view.get('fields.description2'),
            slug: view.get('fields.slug')
        };

        /**
         * Tech debt - NEVER REMOVE THIS!
         * (see NL-115 and LABS-1434)
         */
        if (!isEditMode) {
            if (fields.firstname && fields.firstname.match(/^byline first name$/i)) {
                fields.firstname = '';
            }

            if (fields.lastname && fields.lastname.match(/^byline last name$/i)) {
                fields.lastname = '';
            }
        }

        const data = {
            items: [],
            imageAbove: !!config.imageAbove,
            imageBelow: !config.imageAbove && !!config.imageBelow
        };

        template.forEach((item) => {
            const element = {
                // key: item.key,
                // value: fields[item.key],
                url: null,
                parts: []
            };

            (item.keys || []).forEach((part) => {
                if ((fields[part] && (fields[part] !== `Click to edit ${  part }`)) || isEditMode) {
                    let value = fields[part];
                    let title;

                    if (
                        part === 'description'
                        && config.enableDescriptionLength
                        && (fields[part] && fields[part].length >= config.descriptionLength)
                    ) {
                        title = fields[part];
                        value = `${ fields[part].substring(0, config.descriptionLength) }...`;
                    }

                    element.parts.push({
                        key: part,
                        value,
                        title
                    });
                }
            });

            if (item.url) {
                // Make sure it's a array.
                if (!Array.isArray(item.url)) {
                    item.url = [item.url];
                }
                for (let part of Object.keys(item.url)) {
                    part = item.url[part];
                    if (fields[part]) {
                        let url = fields[part];
                        if (part === 'public_email') {
                            url = `mailto:${  url }`;
                        }
                        element.url = url;
                        break;
                    }
                }
                if (this.shouldUseAuthorPageUrl(fields, model)) {
                    element.url = this.authorPageUrl(model);
                }
            }

            if (element.parts.length) {
                data.items.push(element);
            }
        });

        model.setFiltered('default_color', config.default_color || '');
        model.setFiltered('data', data);
    }

    /**
     * Determines whether the author's byline should link to their author page.
     *
     * This function checks if the author pages feature is enabled in the site configuration
     * and whether the current author meets the criteria for having an author page link.
     * The author page link is used instead of a manually defined email or URL if:
     *  - The `authorPagesConfig.enabled` flag is true
     *  - The author has a public or internal email defined
     *  - Either all authors are allowed (`enableForAll`), or this specific author ID is whitelisted
     *
     * @param {Object} fields - The author field values from the view.
     * @param {Object} model - The model instance representing the byline element.
     *
     * @returns {boolean} Returns `true` if the author page URL should be used for the byline link; otherwise `false`.
     */
    shouldUseAuthorPageUrl(fields, model) {
        if (this.authorPagesConfig.enabled && (fields.public_email || fields.email) && model.get('instance_of')) {
            if (this.authorPagesConfig.enableForAll) {
                return true;
            }
            if (this.authorPagesConfig.enabledAuthorIds) {
                const enabledIds = this.authorPagesConfig.enabledAuthorIds.split(',').map((id) => parseInt(id.trim(), 10));
                if (enabledIds.includes(model.get('instance_of'))) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Builds and returns the full URL to the author's dedicated author page.
     *
     * This method constructs a valid URL to the author’s page using the site’s domain
     * and the configured author page path. It uses the author’s `slug` (if available)
     * for cleaner, SEO-friendly URLs; otherwise, it falls back to the author’s instance ID.
     *
     * Example output:
     * ```
     * https://example.com/author/john-doe
     * ```
     *
     * @param {Object} model - The model instance representing the byline element.
     *
     * @returns {string} The complete URL to the author’s page, combining domain, configured path, and slug or ID.
     */
    authorPageUrl(model) {
        const instanceOfId = model.get('instance_of');
        const instanceOfJson = model.get('instance_of_json') ? JSON.parse(model.get('instance_of_json')) : undefined;
        const instanceOfSlug = (instanceOfJson && instanceOfJson.fields.slug) ? instanceOfJson.fields.slug : undefined;

        return `${ this.domain }/${ this.authorPagesConfig.path || 'author' }/${ instanceOfSlug || instanceOfId || '' }`;
    }

}
