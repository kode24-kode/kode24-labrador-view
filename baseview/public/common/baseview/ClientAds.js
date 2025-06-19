/* eslint-disable import/no-absolute-path */
/* eslint-disable import/no-unresolved */
import { Core } from '/view-resources/baseview/public/common/labrador/Core.js';
import { behaviours } from '/view-resources/build/modules/client_modules.js?v=1';
import * as baseview from '/view-resources/build/modules/client_package.js';

export class ClientAds {

    constructor({ items = [], resources = {} } = {}) {
        this.setupListener();
        this.isDebug = !!resources.debug;
        this.renderer = this.setupLabrador(resources);
        this.insertedUpdatesCount = 0;
        this.contentIdentifiers = [];
        const initialItems = [];
        this.itemsForUpdates = items.filter((item) => {
            const { renderOnUpdates } = (item.placementData || {}).options || {};
            if (!renderOnUpdates) { initialItems.push(item); }
            return !!renderOnUpdates;
        });

        this.render(initialItems);
    }

    setupLabrador(clientResources) {
        window.Sys = window.Sys || {
            logger: console
        };
        const resources = {
            behaviours: {}
        };
        for (const name of Object.keys(behaviours)) {
            resources.behaviours[name] = [behaviours[name]];
        }
        return new Core({
            logger: console,
            settings: {
                siteAlias: `${ clientResources.site.alias }`,
                device: `${ clientResources.device }`,
                debug: !!clientResources.debug,
                transform: false
            },
            resources: {
                config: {
                    site: clientResources.site,
                    // image_server: '{{{ getCmsConfig.image_server }}}',
                    customer: baseview.config,
                    ConfigObject: clientResources.configObject || {}
                },
                templates: {
                    view: baseview.templates
                },
                properties: baseview.properties,
                views: ['baseview_client']
            },
            globals: window,
            callbacks: {},
            // entries: resources.entries,
            behaviours: resources.behaviours
        });
    }

    setupListener() {
        // Allow external code to trigger an update, rendering this.itemsForUpdates
        window.onClientAdsUpdate = (numOfNewItemsAdded, identifier) => {
            // ClientAds run for all instances of Livefeed, so we need to make sure we only update once per identifier
            if (!this.contentIdentifiers.includes(identifier)) {
                this.contentIdentifiers.push(identifier);
                this.update(numOfNewItemsAdded);
            }
        };
    }

    viewDataToInternal(contentdata) {
        if (!contentdata) { return {}; }
        if (!contentdata.fields) { return contentdata; }
        for (const key of Object.keys(contentdata.fields)) {
            contentdata.fields[key] = {
                value: contentdata.fields[key]
            };
        }
        return contentdata;
    }

    viewDataToInternalMeta(metadata) {
        if (!metadata) { return {}; }
        for (const key of Object.keys(metadata)) {
            metadata[key] = {
                value: metadata[key]
            };
        }
        if (this.isDebug) {
            metadata.isDebug = {
                value: true
            };
        }
        return metadata;
    }

    update(numberOfNewItemsAdded) {
        if (!this.itemsForUpdates.length) { return; }
        for (let i = 0; i < numberOfNewItemsAdded; i++) {
            this.insertedUpdatesCount++;
            for (const item of this.itemsForUpdates) {
                const index = item.placement.index || 0;
                if (this.insertedUpdatesCount % index === 0) {
                    const updatedItem = JSON.parse(JSON.stringify(item));
                    updatedItem.placement = { ...(updatedItem.placement || {}), index: 0 };
                    this.render([updatedItem]);
                }
            }
        }
    }

    /**
     * Render data using Labrador rendering engine
     * @param {Array} items Array of objects to render. Each object holds placeholder- and data-information for a single ad.
     * @returns {Array} Array of rendered ads
     */
    render(items = []) {
        this.renderer.setData(items.map((itm) => ({
            type: itm.type, contentdata: this.viewDataToInternal(itm.content_data), metadata: this.viewDataToInternalMeta(itm.metadata), state: { isNonPersistent: true }
        })));
        const result = this.renderer.draw();
        for (const item of items) {
            const markup = result[items.indexOf(item)];
            const tmp = document.createElement('div');
            tmp.innerHTML = markup;
            const element = tmp.firstElementChild;
            element.setAttribute('data-ad-inserted', '1');
            const placement = item.placementData || {};
            const selector = placement.domSelector;
            const container = document.querySelector(selector);
            const { itemsSelector } = placement.options || {};
            const children = [...container.querySelectorAll(itemsSelector)].filter((el) => !el.hasAttribute('data-ad-inserted'));
            const index = item.placement.index || 0;
            let method = 'insertBefore';
            if (index > children.length - 1) {
                method = 'appendChild';
            }
            container[method](element, children[index]);
        }
        return result;
    }

}
