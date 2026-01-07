export default class PaywallManager {

    constructor(api, rootModel, onClose) {
        this.api = api;
        this.rootModel = rootModel;
        this.onClose = onClose;
        this.previewActive = false;
        this.api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/paywall/paywall.css');
        this.previewModel = null;
    }

    setup() {
        this.togglePreview();
    }

    // Toggle the preview of the paywall
    togglePreview() {
        if (this.previewActive) {
            this.deletePreview();
            this.previewActive = false;
        } else {
            this.deletePreview();
            this.createPreview();
            this.previewActive = true;
            setTimeout(() => this.scrollToPaywallPreview(), 100);
        }
    }

    // Insert a paywallPreview model programatically into the correct bodyTextIndex
    createPreview() {
        const lineIndex = lab_api.v1.config.get('paywall.bodytext.lineCount');
        const model = this.api.v1.model.insert.atPath({
            path: 'page_article/bodytext[0]',
            data: {
                type: 'paywallPreview',
                metadata: {
                    bodyTextIndex: lineIndex
                },
                contentdata: {
                    fields: {}
                },
                state: {
                    isNonPersistent: true,
                    editNonPersistent: true,
                    draggableDisabled: true
                }
            },
            options: {
                silent: false
            }
        });

        if (model) {
            this.previewModel = model;
            this.api.v1.model.bindings.bind(model, 'state.deleted', this.handlePreviewDeleted.bind(this));
        }

        return model;
    }

    // Handle when the preview is deleted manually
    handlePreviewDeleted(model, path, value) {
        if (value === true) {
            this.previewActive = false;
            this.previewModel = null;

            if (typeof this.onClose === 'function') {
                this.onClose();
            }
        }
    }

    // Delete the paywall preview model
    deletePreview() {
        this.api.v1.model.delete(this.previewModel, true, true);
    }

    // Scroll to the paywall preview
    scrollToPaywallPreview() {
        lab_api.v1.model.highlight.default(this.previewModel, { scroll: true });
    }

    // Close the paywall preview
    end() {
        this.deletePreview();
        this.previewActive = false;

        if (typeof this.onClose === 'function') {
            this.onClose();
        }
    }

}
