export class ArticleCommercialSettings {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.enabled = true;
        this.dom = {};
        this.helpers = params.helpers;
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">

            <div class="lab-formgroup lab-grid">
                <h2 class="lab-title lab-grid-large-12">Commercial settings</h2>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="paywall">Paywall - Require subscription</label>
                    <input type="checkbox" name="fields.paywall" id="paywall" value="1" {{ #fields.paywall }}checked{{ /fields.paywall }}>
                </div>
                {{ #enableShareableArticle }}
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="paywall">Let paywalled article be shareable</label>
                    <input type="checkbox" name="fields.paywallShareable" id="paywallShareable" value="1" {{ #fields.paywallShareable }}checked{{ /fields.paywallShareable }}>
                </div>
                {{ /enableShareableArticle }}
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="hideAds">Hide ads</label>
                    <input type="checkbox" name="fields.hideAds" id="hideAds" value="1" {{ #fields.hideAds }}checked{{ /fields.hideAds }}>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="hideSkyscraperAds">Hide skyscraper ads</label>
                    <input type="checkbox" name="fields.hideSkyscraperAds" id="hideSkyscraperAds" value="1" {{ #fields.hideSkyscraperAds }}checked{{ /fields.hideSkyscraperAds }}>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="hideTopBannerAd">Hide top banner ad</label>
                    <input type="checkbox" name="fields.hideTopBannerAd" id="hideTopBannerAd" value="1" {{ #fields.hideTopBannerAd }}checked{{ /fields.hideTopBannerAd }}>
                </div>
                <h3 class="lab-grid-large-12">Link Relationship Attributes for this Article (Rel)</h3>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <input type="checkbox" id="addRelUgc" name="fields.addRelUgc" value="1" {{ #fields.addRelUgc }}checked{{ /fields.addRelUgc }}>
                    <label for="addRelUgc">User-generated content</label>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <input type="checkbox" id="addRelSponsored" name="fields.addRelSponsored" value="1" {{ #fields.addRelSponsored }}checked{{ /fields.addRelSponsored }}>
                    <label for="addRelSponsored">Sponsored</label>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <input type="checkbox" id="addRelNoFollow" name="fields.addRelNoFollow" value="1" {{ #fields.addRelNoFollow }}checked{{ /fields.addRelNoFollow }}>
                    <label for="addRelNoFollow">No-follow</label>
                </div>
                 <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap">
                    <p class="lab-info">Select the appropriate "rel" attributes to apply to this article teaser. These settings help with SEO and indicate the nature of a linked content (This article).</p>
                </div>
            </div>
        </div>`;
    }

    // SettingsFront: If section exist: add item to it, if not: create.
    onAside() {
        return {
            section: 'General',
            label: 'Commercial settings'
        };
    }

    onPaths() {
        return {
            'fields.paywall': { node: 'fields.paywall', boolean: true },
            'fields.paywallShareable': { node: 'fields.paywallShareable', boolean: true },
            'fields.hideAds': { node: 'fields.hideAds', boolean: true, suggestReload: true },
            'fields.hideSkyscraperAds': { node: 'fields.hideSkyscraperAds', boolean: true },
            'fields.hideTopBannerAd': { node: 'fields.hideTopBannerAd', boolean: true },
            'fields.addRelUgc': { node: 'fields.addRelUgc', boolean: true },
            'fields.addRelSponsored': { node: 'fields.addRelSponsored', boolean: true },
            'fields.addRelNoFollow': { node: 'fields.addRelNoFollow', boolean: true }
        };
    }

    onMarkup() {
        // Shareable article is enabled in admin -> Article settings -> Commercial settings
        let enableShareableArticle = false;
        const enabledSettings = this.api.v1.config.get('commercial_settings');
        if (enabledSettings && enabledSettings.shareableArticle && enabledSettings.shareableArticle === true) {
            enableShareableArticle = true;
        }

        const markup = this.api.v1.util.dom.renderTemplate(this.template, {
            fields: {
                paywall: this.helpers.toBoolean(this.rootModel.get('fields.paywall')),
                paywallShareable: this.helpers.toBoolean(this.rootModel.get('fields.paywallShareable')),
                hideAds: this.helpers.toBoolean(this.rootModel.get('fields.hideAds')),
                hideSkyscraperAds: this.helpers.toBoolean(this.rootModel.get('fields.hideSkyscraperAds')),
                hideTopBannerAd: this.helpers.toBoolean(this.rootModel.get('fields.hideTopBannerAd')),
                addRelUgc: this.helpers.toBoolean(this.rootModel.get('fields.addRelUgc')),
                addRelSponsored: this.helpers.toBoolean(this.rootModel.get('fields.addRelSponsored')),
                addRelNoFollow: this.helpers.toBoolean(this.rootModel.get('fields.addRelNoFollow'))
            },
            enableShareableArticle
        }, true);
        return markup;
    }

}
