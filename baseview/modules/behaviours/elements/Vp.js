export default class Vp {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
    }

    onRender(model, view) {

        // Display caption on article-pages:
        let displayCaption = this.api.v1.model.root.getType() === 'page_article';
        if (this.api.v1.app.mode.isFront() && !view.get('fields.caption')) {
            displayCaption = false;
        }
        model.setFiltered('displayCaption', displayCaption);

        if (!this.api.v1.app.mode.isEditor() && this.api.v1.config.get('cookieConsent.enabled') === true) {
            const cookieConsentConfig = this.api.v1.config.get('cookieConsent');
            const vpConsent = cookieConsentConfig.contentboxes.filter((box) => box.name === 'vp')[0];

            if (vpConsent) {
                model.setFiltered('requiredCookieConsent', vpConsent.requiredConsent || false);
                model.setFiltered('insufficientConsentMessage', vpConsent.insufficientConsentMessage || this.api.v1.config.get('cookieConsent.insufficientConsentMessage') || '');
            }
        }

        if (model.get('fields.verticalVideo')) {
            model.setFiltered(
                'playerUrl',
                `${ model.get('fields.playerUrl') }&aspectRatio=9:16`
            );
        } else {
            model.setFiltered('playerUrl', model.get('fields.playerUrl'));
        }

    }

    onRendered(model, view) {
        if (this.isEditor) {
            // The iframe captures events disabling drag/drop in the editor.
            // Disable pointer-events when hovering the drag-handle.
            const iframe = view.getMarkup().querySelector('iframe');
            const dragHandle = view.getMarkup().querySelector('.video-drag-handle');
            if (iframe && dragHandle) {
                dragHandle.addEventListener('mouseenter', (event) => { iframe.style.pointerEvents = 'none'; }, false);
                dragHandle.addEventListener('mouseleave', (event) => { iframe.style.pointerEvents = ''; }, false);
            }
        }
    }

}