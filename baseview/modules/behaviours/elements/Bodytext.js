import { Paywall } from '../../lib/helpers/Paywall.js';

export default class Bodytext {

    constructor(api) {
        this.api = api;
        this.isFront = this.api.v1.app.mode.isFront();
        this.internal = this.api.v1.properties.get('paywall') || {};
        const paywallConfig = this.api.v1.config.get('paywall') || {};
        this.provider = paywallConfig.provider || 'internal';
        // View can disable displaying buildt-in paywall in config: { paywall: { displaySalesPosters: false, ... } }
        // Useful for providers rendering the salesposters client-side
        this.displaySalesPosters = paywallConfig.displaySalesPosters !== false;
    }

    onRender(model, view) {
        const newzwareConfig = this.api.v1.config.get('newzware') || {};
        const isNewzwareEnabled = this.isFront && this.provider === 'newzware' && newzwareConfig.enabled === true;

        const paywall = {
            displaySalesPosters: this.displaySalesPosters,
            isInternal: this.provider === 'internal' && this.internal.active,

            active: this.isFront && (this.provider === 'internal' ? this.internal.active : !!Number(model.get('fields.paywall'))),
            access: this.provider === 'internal' && this.internal.active ? this.internal.hasAccess : false,

            provider: this.provider,
            intro: this.provider !== 'internal' ? Paywall.filterBodytext(model, view) : undefined,
            bodytext: this.provider !== 'internal' ? model.get('filtered.bodytext') : undefined
        };

        if (paywall.active && !paywall.access && !isNewzwareEnabled) {
            if (this.provider === 'internal') {
                model.setFiltered('bodytext', Paywall.filterBodytext(model, view));
            } else {
                // Original bodytext, inside article
                model.setFiltered('bodytext', '');
            }
        }

        // Sesamy special handling - proxyLock is server-side rendering of paywall with client unlock
        if (this.isFront && this.provider === 'sesamy' && !!Number(model.get('fields.paywall'))) {
            const sesamyConfig = this.api.v1.config.get('sesamy') || {};

            // Standard sesamy - empty bodytext inside article if protected
            if (this.internal.isProtected === true && sesamyConfig.enabled === true) {
                // Original bodytext, not positioned inside sesamy container
                model.setFiltered('bodytext', '');
            } else if (sesamyConfig.enabled === false) {
                // Restore original bodytext if sesamy is disabled
                model.setFiltered('bodytext', model.get('fields.bodytext'));
            }

            // Proxy lock - remove bodytext from paywall container if protected
            if (this.internal.isProtected === true && this.internal.hasAccess === false && sesamyConfig.enabledProxyLock === true && sesamyConfig.enabled === true) {
                paywall.bodytext = '';
            }
        }

        if (this.provider === 'iteras' && paywall.active) {
            const iterasConfig = this.api.v1.config.get('iteras') || {};
            const tags = model.get('tags') || [];
            paywall.iteras = Paywall.iterasPaywall(iterasConfig, tags);
        }

        model.setFiltered('paywall', paywall);
    }

    onRendered(model, view) {
        // Editor: Add an empty paragraph at the end of the bodytext if there is none.
        if (!this.isFront) {
            const markup = view.getMarkup();
            if (markup.children.length && markup.children[markup.children.length - 1].tagName !== 'P') {
                const p = document.createElement('p');
                markup.appendChild(p);
            }
            this.markCustomIndex(model.getPersistentChildren());
        }
    }

    // Baseview is configured to allow custom placement per viewport in bodytext.
    // If user has moved an element to a new placement in a secondary viewport, mark it with an icon.
    // A click on the icon will reset the position.
    markCustomIndex(children) {
        for (const child of children) {
            const raw = child.getRaw('metadata.bodyTextIndex') || {};
            if (Object.values(raw.vp || {}).filter((value) => Number.isInteger(value)).length > 1) {
                this.markCustomIndexForModel(child);
            }
        }
    }

    markCustomIndexForModel(model) {
        for (const viewport of this.api.v1.viewport.getActive()) {
            const view = this.api.v1.view.getView(model, viewport);
            if (!view.getExtraElement('customIndexElement')) {
                const el = view.setExtraElement('customIndexElement', this.getCustomIndexElement(model, view));
                view.getMarkup().appendChild(el);
            }
        }
    }

    getCustomIndexElement(model, view) {
        const el = document.createElement('span');
        const callback = (event) => {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            this.removeCustomIndexElement(model);
            if (model.getParent()) {
                this.api.v1.model.addToRedrawQueue(model.getParent());
            }
            model.set('metadata.bodyTextIndex', undefined, { viewport: 'mobile' });
            this.api.v1.viewport.align(model, view);
        };
        el.addEventListener('click', callback, false);
        el.classList.add('labicon-line_index', 'is-customindex');
        el.setAttribute('title', `${ model.getType() } has custom placement. Click to remove on mobile`);
        const bindingHandler = (theModel, key, path) => {
            if (theModel.getParent() && theModel.getParent().getType() !== 'bodytext') {
                callback();
                el.remove();
                this.api.v1.model.bindings.unbind(model, 'path', bindingHandler);
            }
        };
        this.api.v1.model.bindings.bind(model, 'path', bindingHandler);
        return el;
    }

    removeCustomIndexElement(model) {
        for (const view of this.api.v1.view.getViews(model)) {
            view.unsetExtraElement('customIndexElement');
        }
    }

}
