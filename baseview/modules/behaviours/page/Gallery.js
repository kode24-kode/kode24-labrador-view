import { PageAPI } from '../../lib/api/PageAPI.js';
import { PageData } from '../../lib/PageData.js';

export default class Gallery {

    constructor(api) {
        this.api = api;
        this.pageData = new PageData(this.api, new PageAPI(this.api));
        this.isFront = this.api.v1.app.mode.isFront();

        const galleryConfig = this.api.v1.config.get('page_settings.gallery') || {};
        this.gallerySettings = {
            displayHeader: this.api.v1.util.defaults.true(galleryConfig.displayHeader),
            displayFooter: this.api.v1.util.defaults.true(galleryConfig.displayFooter),
            pageBackgroundColor: galleryConfig.pageBackgroundColor || '#000000',
            pageTextColor: galleryConfig.pageTextColor || '#ffffff',
            logImageView: this.api.v1.util.defaults.false(galleryConfig.logImageView)
        };
    }

    onReady(model, view) {

        if (!this.isFront) { return; }

        const slideshow = this.api.v1.model.query.getChildOfType(model, 'slideshow');
        if (!slideshow) {
            Sys.logger.warn('[Gallery] No slideshow found, skipping gallery setup ...');
            return;
        }

        const viewport = view.getViewport();

        // The gallery model is created temporarily and has a random id.
        // Set id to the page id to allow the model to report correct id to other functionality.
        // Note: This will never run in the editor.
        model.set('id', model.get('fields.parent_node_id'));

        // Add fields.published_url to generate url's for social media sharing:
        model.set('fields.published_url', `/gallery/${ model.getId() }/${ slideshow.getId() }`);

        this.pageData.set(model, view);

        // Disable gallery mode for slideshow
        slideshow.set('fields.gallery_active', false);

        // Ignore original size:
        slideshow.set('width', 100, { viewport: 'mobile' });
        slideshow.set('width', 100, { viewport: 'desktop' });

        // Display preview:
        const slideshowView = this.api.v1.view.getView(slideshow, view.getViewport());
        slideshowView.set('metadata.displayPreview', true);

        slideshow.set('metadata.hasFullWidth', false, { viewport: 'mobile' });
        slideshow.set('metadata.hasFullWidth', false, { viewport: 'desktop' });

        // Set aspect ratio:
        if (viewport === 'mobile') {
            slideshowView.set('fields.aspectRatio', 1);
        } else {
            slideshowView.set('fields.aspectRatio', 0.75);
        }

        // Update filtered values for title and description used for meta tags and analytics:
        const title = `${ this.api.v1.locale.get('gallery.label') } - ${ slideshow.get('fields.title') || slideshow.getId() }`;
        const description = `${ slideshow.get('fields.description') || '[description]' }`;
        model.set('filtered.title', slideshow.get('fields.title') || this.api.v1.locale.get('gallery.label'));
        model.set('filtered.seotitle', title);
        model.set('filtered.sometitle', title);
        model.set('filtered.seodescription', description);
        model.set('filtered.somedescription', description);
        model.set('filtered.gallerySettings', this.gallerySettings);
        model.set('filtered.imageCount', slideshow.children.length);
    }

}
