/**
 * Use-cases:
 * - Vise et gui for alle felt, få forslag for alt
 * - Finne forslag for alt i bakgrunnen, oppdatere knapp i Labrador-menyen som viser at nå har vi noe
 * - Forslag for ett felt i artikkel-settings
 * - Forslag for ett felt via tekst-verktøy
 */

import { Manager } from './Manager.js';
import { LabradorAi } from '../../lib/helpers/LabradorAi.js';

export default {
    name: 'TextAssistant',
    description: 'Labrador assistive AI tools',
    version: '2.0.0',
    predicate: (api) => api.v1.model.root.getType() === 'page_article' && api.v1.config.get('plugins.textassistant.enable'),
    entry: class {

        onReady(api) {
            this.api = api;
            this.manager = new Manager(api, this.api.v1.model.query.getRootModel(), this.api.v1.config.get('plugins.textassistant'));
            this.labradorAi = new LabradorAi(api, this.api.v1.model.query.getRootModel());

            // Define the API-methods for the textAssistant plugin and Labrador AI tools
            this.api.v1.ns.set('textAssistant', {
                // Generate content for the current element, use Labrador AI to request generation
                generateContent: (model, view, item, params) => {
                    const [prompt, aiIntegrationSettings] = this.labradorAi.preprocessGeneration(model, view, item, params);
                    return this.labradorAi.requestGeneration(prompt, aiIntegrationSettings)
                        .then((result) => this.labradorAi.postprocessGeneration(model, view, item, params, result))
                        .catch((error) => {
                            Sys.logger.warn(`[Labrador Ai - ${ params.featureName }] Error generating content:`, error);
                            lab_api.v1.ui.modal.dialog({
                                container: {
                                    state: {
                                        error: true
                                    }
                                },
                                content: {
                                    title: 'Error: Labrador AI',
                                    description: `An error has occurred: ${ error }`
                                },
                                footer: {
                                    buttons: [
                                        {
                                            type: 'submit',
                                            value: 'Close',
                                            highlight: true
                                        }
                                    ]
                                }
                            });
                            if (view) {
                                this.labradorAi.modifyClassNamesInView(view, { remove: ['lab-busy', 'lab-busy-top'], add: ['lab-highlight-error'] });
                            }
                        });
                },
                // Open settings modal for AI feature
                openFeatureSettings: (model, view, item, params) => {
                    // Todo: It should be possible to provide a path to a template for a specific feature
                    console.log(model, view, item, params);
                    this.labradorAi.openFeatureSettings(model, view, item, params);
                },

                generateCaption: (model, view, item, params) => {
                    // console.log(model, view, item, params);
                    this.manager.generateCaption(model, view, { model: 'gpt-4o' }, true);
                },

                fetchByGroupName: (name, aiSettings, options) => this.manager.fetchByGroupName(name, aiSettings, options, true),

                // await lab_api.v1.ns.get('textAssistant.fetchByPath')('fields.title', { tone: 'Sarcastic' })
                fetchByPath: (path, options, aiSettings) => this.manager.fetchByPath(path, options, aiSettings),

                // await lab_api.v1.ns.get('textAssistant.fetchByPath')('fields.title', { tone: 'Sarcastic' })
                fetchByName: (path, options) => this.manager.fetchByName(path, options),

                // await lab_api.v1.ns.get('textAssistant.cleanUpJsonString')
                cleanUpJsonString: (data) => this.manager.cleanUpJsonString(data),

                // (void) Set up a listener for the bodytext. Create suggestions automatically
                listen: () => {
                    this.manager.listen();
                },

                // (bool) Check if suggestions can be made
                allow: () => this.manager.allowSuggestion(),

                // (void) Allow Labrador text-tools to insert suggestion for current element
                textToolSuggestion: (model, view, menuItem, params) => {
                    const { tool } = menuItem.getMenu();
                    if (tool) {
                        const { key } = tool.settings;
                        if (this.manager.hasPath(key)) {
                            tool.end();
                            let elements = [];
                            const toggle = (on) => {
                                for (const element of elements) {
                                    if (on) {
                                        element.classList.add('lab-busy', 'lab-busy-top');
                                    } else {
                                        element.classList.remove('lab-busy', 'lab-busy-top');
                                    }
                                }
                            };
                            setTimeout(() => {
                                elements = [...view.getMarkup().querySelectorAll(`[data-lab-editable-path='${ key }']`)];
                                toggle(true);
                            }, 100);
                            this.manager
                                .fetchByPath([key], true)
                                .then((result) => {
                                    if (result) {
                                        view.set(key, result);
                                    } else {
                                        console.log(`Error: Required path ${ key } did not return.`);
                                    }
                                    toggle(false);
                                })
                                .catch((error) => {
                                    console.log('error: ', error);
                                    toggle(false);
                                });
                        }
                    }
                },

                // (void) Display UI for all fields
                displayUI: (model, view, item, params) => {
                    this.manager.displayUI();
                }
            });
        }

    }
};
