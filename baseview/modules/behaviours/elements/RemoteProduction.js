export default class RemoteProduction {

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
            const remoteProductionConsent = cookieConsentConfig.contentboxes.filter((box) => box.name === 'remoteproduction')[0];

            if (remoteProductionConsent) {
                model.setFiltered('requiredCookieConsent', remoteProductionConsent.requiredConsent || false);
                model.setFiltered('insufficientConsentMessage', remoteProductionConsent.insufficientConsentMessage || this.api.v1.config.get('cookieConsent.insufficientConsentMessage') || '');
            }
        }
    }

    onRendered(model, view) {
        if (this.isEditor) {
            // The iframe from remote production player captures events on the element of the iframe disabling drag/drop in the editor.
            // Disable pointer-events when hovering the drag-handle.
            const iframe = view.getMarkup().querySelector('iframe');
            const dragHandle = view.getMarkup().querySelector('.remoteproduction-drag-handle');
            if (iframe && dragHandle) {
                dragHandle.addEventListener('mouseenter', (event) => { iframe.style.pointerEvents = 'none'; }, false);
                dragHandle.addEventListener('mouseleave', (event) => { iframe.style.pointerEvents = ''; }, false);
            }
        }
    }

}
