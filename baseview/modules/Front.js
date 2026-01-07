import { DynamicDataHelper } from './lib/helpers/dynamic/DynamicDataHelper.js';
import { FragmentHelper } from './lib/helpers/FragmentHelper.js';
import { PageExport } from './lib/helpers/PageExport.js';
import { EsiHelper } from './lib/helpers/dynamic/EsiHelper.js';
import { Spacing } from './lib/helpers/Spacing.js';

export default class {

    constructor() {
        this.name = 'Baseview';
        this.api = null;
        this.pageAPI = null;
        this.useSpacing = false;
    }

    onReady(api) {
        this.api = api;

        Sys.logger.debug(`[Front] Running Baseview version ${ this.api.v1.config.get('view_version') }, build ${ this.api.v1.config.get('view_build.baseview.version') }`);

        // Display JSON Viewport data.
        // Return an array with a serialized version of the root-model in a format equal to backend API-format
        if (this.api.v1.viewport.getName() === 'json') {
            if (this.api.v1.config.get('viewports.json.renderer') === 'PageExport.jsonData') {
                const pageExporter = new PageExport(this.api);
                this.api.v1.view.on('rendered', (markups, viewport) => [JSON.stringify(pageExporter.jsonData(this.api.v1.model.query.getRootModel()), null, 4)]);
            }
        }

        // Display oEmbed of article. https://oembed.com
        if (this.api.v1.viewport.getName() === 'oembed') {
            if (this.api.v1.config.get('viewports.oembed.renderer') === 'PageExport.oembed') {
                const pageExporter = new PageExport(this.api);
                this.api.v1.view.on('rendered', (markups, viewport) => [JSON.stringify(pageExporter.oembed(this.api.v1.model.query.getRootModel()), null, 4)]);
            }
        }

        const fragmentHelper = new FragmentHelper(this.api, this.api.v1.util.request);
        fragmentHelper.listen();
    }

    onAcceptContent() {
        const rootModel = this.api.v1.model.query.getRootModel();

        // Check if custom spacing is supported on this page
        this.useSpacing = !!(rootModel && rootModel.get('fields.style_spacing'));

        if (this.api.v1.app.mode.getSimulatedMode() === 'editor') {
            Sys.logger.debug('[Front] Labrador is running in simulated editor-mode. Skipping DynamicDataHelper and EsiHelper.');
            return;
        }
        const dynamicData = new DynamicDataHelper(this.api);
        const clientSidePlacements = dynamicData.insert(this.api.v1.viewport.getName());
        if (clientSidePlacements.length > 0 && !rootModel.get('fields.hideAds')) {
            // The head-template will use this data to render the placements client side using the script ClientAds.js.
            rootModel.setFiltered('clientSidePlacements', JSON.stringify(clientSidePlacements));
            rootModel.setFiltered('clientSideResources', JSON.stringify({
                configObject: {
                    viewConfig: {
                        config: {
                            customer: {
                                contentbox_settings: {
                                    adnuntiusAd: this.api.v1.config.get('contentbox_settings.adnuntiusAd') || {},
                                    googleAd: this.api.v1.config.get('contentbox_settings.googleAd') || {}
                                },
                                adEnvironment: this.api.v1.config.get('adEnvironment') || {}
                            }
                        }
                    }
                },
                site: this.api.v1.site.getSite(),
                device: this.api.v1.properties.get('device'),
                debug: this.api.v1.util.request.hasQueryParam('debug') || false
            }));
        }

        const esiHelper = new EsiHelper(this.api);
        esiHelper.register(rootModel, this.api.v1.site.getSite().alias);

        // Allow url param lab_opts to hide header and footer
        // Note: This method is also defined in Editor.js, so the method is never run in the editor.
        if (this.api.v1.util.request.hasQueryValue('lab_opts', 'hideHeader')) {
            Sys.logger.debug('[Front] Hiding header and logo based on url param lab_opts=hideHeader ...');
            rootModel.setFiltered('pageHeaderDisplay', 'hideHeaderAndLogo');
        }
        if (this.api.v1.util.request.hasQueryValue('lab_opts', 'hideFooter')) {
            Sys.logger.debug('[Front] Hiding footer based on url param lab_opts=hideFooter ...');
            rootModel.setFiltered('pageFooterDisplay', 'hideFooter');
        }
        if (this.api.v1.util.request.hasQueryValue('lab_opts', 'hideComments')) {
            Sys.logger.debug('[Front] Hiding Hyvor comments based on url param lab_opts=hideComments ...');
            rootModel.setFiltered('pageCommentsDisplay', 'hideComments');
        }
    }

    onRender(model, view) {
        if (this.useSpacing) {
            model.setFiltered('styleSheets', Spacing.createStyle({
                model,
                view,
                viewports: ['desktop', 'mobile'],
                returnArray: false
            }));
        }
    }

    onMapData(data) {
        // Map text_title and text_subtitle to text_singleline
        if (data.type === 'text_title' || data.type === 'text_subtitle') {
            if (!data.contentdata || !data.contentdata.fields) {
                return undefined;
            }
            const modifiedData = { ...data };
            modifiedData.type = 'text_singleline';
            modifiedData.contentdata.fields.text = modifiedData.contentdata.fields.title || modifiedData.contentdata.fields.subtitle;
            if (data.type === 'text_subtitle') {
                modifiedData.contentdata.fields.elementType = { value: 'h3' };
                delete modifiedData.contentdata.fields.subtitle;
            } else {
                modifiedData.contentdata.fields.elementType = { value: 'h2' };
                lab_api.v1.util.object.set('attributes.text_size.vp.desktop', lab_api.v1.util.object.get('attributes.text_size.vp.desktop', modifiedData.contentdata.fields.text) || 44, modifiedData.contentdata.fields.text);
                delete modifiedData.contentdata.fields.title;
            }
            modifiedData.lab_internal_format = true;
            return modifiedData;
        }
        return undefined;
    }

}
