import { LayoutHelper } from '../../lib/helpers/LayoutHelper.js';

export default class ArticleHeader {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.tagsAsTermsConfig = this.api.v1.properties.get('tags_as_terms');
    }

    onInserted(model) {
        if (model.get('metadata.hidecaption')) {
            model.set('fields.displayCaption', false, { save: false });
            model.set('metadata.hidecaption', null, { save: false });
        }
    }

    onReady(model, view) {
        const tagsAsTerms = this.tagsAsTermsConfig;
        const showSubsection = model.get('metadata.showSubsection');
        if (showSubsection) {
            const subsectionField = this.rootModel.get('fields.subsection');
            let subsectionTerm;
            const terms = this.rootModel.get('term');
            if (subsectionField && tagsAsTerms && terms) {
                if (terms.section) {
                    const sectionTerm = terms.section.find((term) => term.name === subsectionField || term.name === subsectionField.replace(' ', '-'));
                    if (sectionTerm) {
                        subsectionTerm = sectionTerm.displayName;
                    }
                }
                if (!subsectionTerm && terms.keyword) {
                    const keywordTerm = terms.keyword.find((term) => term.name === subsectionField || term.name === subsectionField.replace(' ', '-'));
                    if (keywordTerm) {
                        subsectionTerm = keywordTerm.displayName;
                    }
                }
            }
            model.setFiltered('subsection', subsectionTerm || subsectionField || '');

            const subsectionLabelHasLink = model.get('metadata.subsectionLabelHasLink');
            if (subsectionLabelHasLink) {
                const siteDomain = this.api.v1.site.getSite().domain;
                const sectionName = this.rootModel.get('primaryTags.section');
                const subsectionTagPageLink = `${ siteDomain }/${ sectionName }/${ subsectionField }`;
                model.setFiltered('subsectionLink', subsectionTagPageLink);
            }
        }

        const showSection = model.get('metadata.showSection');
        if (showSection) {
            const sectionInDateline = model.get('metadata.sectionInDateline');
            if (sectionInDateline) {
                const sectionLabelHasLink = model.get('metadata.sectionLabelHasLink');
                if (sectionLabelHasLink) {
                    const tagPath = this.api.v1.config.get('tagPagePath') || '/tag/';
                    const siteDomain = this.api.v1.site.getSite().domain;
                    const sectionName = this.rootModel.get('primaryTags.section');
                    const sectionTagPageLink = `${ siteDomain }${ tagPath }${ sectionName }`;
                    model.setFiltered('sectionLink', sectionTagPageLink);
                }
            }
        }

        const mainterm = this.rootModel.get('mainterm');
        const sectionDisplayName = tagsAsTerms && mainterm && mainterm.section && mainterm.section.displayName ? mainterm.section.displayName : this.rootModel.get('primaryTags.section');
        model.setFiltered('sectionDisplayName', sectionDisplayName);
    }
 
    onRender(model, view) {
        const layout = LayoutHelper.textElements(view, this.api.v1.app.mode.isEditor());
        model.setFiltered('layout', layout);
        model.setFiltered('hasFloatingText', layout.floating.length > 0);
        if (this.api.v1.app.mode.isFront()) {
            // Lab 3 could store styled kicker with text-content of the placeholder.
            // <span class="font-weight-bold" data-lab-font_weight_desktop="font-weight-bold">Click to add kicker</span>
            const kicker = model.get('fields.kicker');
            model.setFiltered('hideKicker', !kicker || kicker.includes('Click to add kicker'));
        }

        // Should the section label be a link to the tag page?
        // Fetch the tagpage path, site domain, and the actual name of the section, create a link and add it to the filtered data
        const sectionLabelHasLink = model.get('metadata.sectionLabelHasLink');
        if (sectionLabelHasLink) {
            const tagPath = this.api.v1.config.get('tagPagePath') || '/tag/';
            const siteDomain = this.api.v1.site.getSite().domain;
            const sectionName = this.rootModel.get('primaryTags.section');
            const sectionTagPageLink = `${ siteDomain }${ tagPath }${ sectionName }`;
            model.setFiltered('sectionLink', sectionTagPageLink);
        }

        // Section placement
        const sectionPlacement = model.get('metadata.sectionPlacement') || 'overImage';
        model.setFiltered('sectionPlacement.underImage', sectionPlacement === 'underImage');
    }

    async onChildAdded(model, childModel) {
        // Use image for front crop if:
        // - Child is an image
        // - Front-crop do not exist
        if (childModel.getType() !== 'image') {
            return;
        }
        this.api.v1.article.frontcrop.get().then((cropData) => {
            if (cropData) { return; }
            const instanceOfId = childModel.get('instance_of');
            if (instanceOfId) {
                this.setFrontCrop(instanceOfId, childModel);
            } else {
                // If image is being downloaded, wait for it to finish and then set the front crop.
                this.api.v1.model.bindings.bind(childModel, 'instance_of', (image, path, value) => {
                    this.setFrontCrop(value, childModel);
                });
            }
        }).catch((err) => {
            Sys.logger.warn(`[ArticleHeader] Failed to get front-crop: "${ err.toString() }"`);
        });
    }

    setFrontCrop(instanceOfId, imageModel) {
        const altText = imageModel ? (imageModel.get('fields.altText') || '') : '';
        const data = {
            type: 'image',
            contentdata: {
                instance_of: instanceOfId,
                fields: {
                    croph: 100,
                    cropw: 100,
                    x: 0,
                    y: 0,
                    ...(altText && { altText })
                }
            }
        };
        this.api.v1.article.frontcrop.set({ pano: data, height: data }).then(() => {
            Sys.logger.debug('[ArticleHeader] Front-crop successfully set.');
        }).catch((err) => {
            Sys.logger.warn(`[ArticleHeader] Failed to set front-crop: "${ err.toString() }"`);
        });
    }

}
