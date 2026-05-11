import { PageAPI } from '../../lib/api/PageAPI.js';
import { PageData } from '../../lib/PageData.js';
import { GallerySeoHelper } from '../../lib/helpers/GallerySeoHelper.js';

export default class Gallery {

    constructor(api) {
        this.api = api;
        this.pageData = new PageData(this.api, new PageAPI(this.api));
        this.isFront = this.api.v1.app.mode.isFront();
        const isMobile = this.api.v1.viewport.getName() === 'mobile';

        const galleryConfig = this.api.v1.config.get('page_settings.gallery') || {};
        this.gallerySettings = {
            displayHeader: this.api.v1.util.defaults.true(galleryConfig.displayHeader),
            displayFooter: this.api.v1.util.defaults.true(galleryConfig.displayFooter),
            pageBackgroundColor: galleryConfig.pageBackgroundColor || '#000000',
            pageTextColor: galleryConfig.pageTextColor || '#ffffff',
            logImageView: this.api.v1.util.defaults.false(galleryConfig.logImageView),
            mobileVertical: this.api.v1.util.defaults.false(isMobile && galleryConfig.mobileVertical)
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

        // Compose SEO + SoMe title/description before pageData.set so
        // SEOHelper.getStructuredData picks up the filtered values when it
        // assembles the jsonld.
        const parentNodeTitle    = model.get('fields.parent_node_title');
        const parentSeoTitle     = model.get('fields.parent_node_seotitle');
        const articleTitleForSeo = parentSeoTitle || parentNodeTitle;
        const slideshowTitle     = slideshow.get('fields.title');
        const slideshowDesc      = slideshow.get('fields.description');
        const galleryLabel       = this.api.v1.locale.get('gallery.label');
        const siteName           = this.api.v1.properties.get('site.display_name') || '';
        const locale             = this.api.v1.locale;
        const imageCount         = (this.api.v1.model.query.getChildrenOfType(slideshow, 'image', true) || []).length;

        const seoTitle = GallerySeoHelper.composeTitle({
            articleTitle:   articleTitleForSeo,
            slideshowTitle, galleryLabel, siteName
        });

        const seoDescription = GallerySeoHelper.composeDescription({
            slideshowDescription: slideshowDesc,
            parentSeoDescription: model.get('fields.parent_node_seodescription'),
            parentSubtitle:       model.get('fields.parent_node_subtitle'),
            imageCount,
            articleTitle:         articleTitleForSeo,
            locale
        });

        const someTitle = GallerySeoHelper.composeSomeTitle({
            slideshowTitle,
            parentSomeTitle: model.get('fields.parent_node_sometitle'),
            parentTitle:     parentNodeTitle,
            galleryLabel, siteName
        });

        const someDescription = GallerySeoHelper.composeSomeDescription({
            slideshowDescription:  slideshowDesc,
            parentSomeDescription: model.get('fields.parent_node_somedescription'),
            parentSeoDescription:  model.get('fields.parent_node_seodescription'),
            parentSubtitle:        model.get('fields.parent_node_subtitle'),
            imageCount,
            articleTitle:          articleTitleForSeo,
            locale
        });

        model.set('filtered.title',          slideshowTitle || galleryLabel);
        model.set('filtered.seotitle',       seoTitle);
        model.set('filtered.sometitle',      someTitle);
        model.set('filtered.seodescription', seoDescription);
        model.set('filtered.somedescription', someDescription);
        model.set('filtered.gallerySettings', this.gallerySettings);
        model.set('filtered.imageCount',      imageCount);

        // Get parent article title if this gallery is accessed from an article
        const showArticleTitle = slideshow.get('fields.gallery_show_article_title');
        if (parentNodeTitle && showArticleTitle) {
            model.set('filtered.parentArticleTitle', parentNodeTitle);
        }

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
    }

}
