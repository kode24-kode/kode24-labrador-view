import { LabradorAi } from '../../modules/lib/helpers/LabradorAi.js';
import AiModels from '../../modules/lib/helpers/AiModels.js';

export default class LabradorAiAdmin {

    constructor(params) {
        this.dataTimeout = null;
        this.params = params;
        this.site = this.params.site;
        this.siteName = this.site;
        this.promptInstructions = lab_api.v1.config.get('promptInstructions');
        this.features = this.promptInstructions.feature ? Object.keys(this.promptInstructions.feature) : {};
        this.labradorAi = new LabradorAi(lab_api);
        this.aiModels = new AiModels();
        this.currentLanguage = null;
        this.globalSiteName = null;
        this.initialisePreview();
        // Wait for both AI models and viewConfig to be ready before populating dropdowns
        this.initializeDropdowns();
    }

    async initializeDropdowns() {
        // Ensure AI models are loaded first
        await this.aiModels.ensureInitialized();
        // Then update the dropdowns after viewConfig is ready
        await this.updateAiProviderDropdowns();
    }

    // Method called by ConfigObjectEditor.
    // Return a method to use as a listener for data-modifications.
    getListener() {
        return this.dataModified.bind(this);
    }

    // May be called frequently. Use a timeout.
    // Also need a timeout to let ConfigObjectEditor update GUI
    dataModified(data, modifiedPaths, site) {
        /**
         * Handle data modifications
         * @param {object} data - The modified data
         * @param {array} modifiedPaths - The paths that have been modified
         * @param {string} site - The site alias
         */
        clearTimeout(this.dataTimeout);
        this.dataTimeout = setTimeout(() => {
            this.handleModifiedData(data, modifiedPaths, site);
        }, 500);
    }

    initialisePreview() {
        /**
         * Initialise the preview area for each feature
         */
        // Wait for initial data to be rendered - timeout is a hack and should be replaced with a proper event listener
        setTimeout(() => {
            const features = lab_api.v1.config.getConfig(`pages.labradorAi.data.items`);
            for (const feature of Object.keys(features)) {
                if (this.features.includes(feature)) {
                    this.updateFeatureContainer(feature);
                } else if (feature === 'globalSettings') {
                    const siteName = document.getElementById('input-globalSettings.siteName');
                    if (siteName) {
                        if (this.site) {
                            const siteInfo = this.labradorAi.getSiteInfo(this.site);
                            if (siteInfo.display_name) {
                                siteName.setAttribute('placeholder', siteInfo.display_name);
                            } else if (siteInfo.alias) {
                                siteName.setAttribute('placeholder', siteInfo.alias);
                            } else {
                                siteName.setAttribute('placeholder', 'Describe your site');
                            }
                            this.globalSiteName = siteName.value || siteInfo.display_name || siteInfo.alias;

                        }
                    }
                    document.getElementById('input-globalSettings.siteName').addEventListener('change', (e) => {
                        this.globalSiteName = e.target.value;
                    });

                }
            }
        }, 1500);

        document.querySelector('.lab-site-container-top').addEventListener('change', (e) => {
            this.initialisePreview();
        });
    }

    getSitePromptConfig(feature, customParams) {
        /**
         * Get the prompt config for 'site prompt'
         * @param {string} feature - The feature name
         */
        const paramsFeature = {
            featureName: feature,
            siteAlias: this.site

        };
        const promptConfigFeature = this.labradorAi.getPromptConfig(paramsFeature, null);

        const container = document.querySelector(`.lab-item-container[data-path="${ feature }"]`);
        const siteInfo = this.labradorAi.getSiteInfo(this.site);
        const featureTitle = container.querySelector(`.lab-item-group-title`);
        const h3 = featureTitle.textContent;
        // Get prompt config for site prompt
        const promptBaseFeature = this.labradorAi.getPrompt(promptConfigFeature, {});
        const params = {
            featureName: 'sitePrompt',
            siteAlias: this.site,
            promptOriginal: promptBaseFeature,
            featureTitle: h3
        };
        const customParamsFeature = customParams || {};
        customParamsFeature.siteName = customParamsFeature.siteName || siteInfo.display_name;
        const promptConfig = this.labradorAi.getPromptConfig(params, customParamsFeature);
        return promptConfig;
    }

    updateFeatureContainer(feature) {
        /**
         * Create/update custom html for a General Settings area and feature containers
         * @param {string} feature - The feature name
         */
        const container = document.querySelector(`.lab-item-container[data-path="${ feature }"]`);
        const promptSiteArea = document.querySelector(`.lab-item[data-path="${ feature }.promptSite"]`);
        const label = promptSiteArea.querySelector('label');

        // Create a new div to hold the label
        let sitePromptContainer = promptSiteArea.querySelector('.lab-label-container');
        if (!sitePromptContainer) {
            sitePromptContainer = document.createElement('div');
            sitePromptContainer.classList.add('lab-label-container'); // Add the class to the new div

            // Move the label into the new div
            sitePromptContainer.appendChild(label);

            const buttonGeneratesitePrompt = document.createElement('button');
            buttonGeneratesitePrompt.innerText = 'Generate AI instructions';
            buttonGeneratesitePrompt.classList.add('lab-generate');
            buttonGeneratesitePrompt.addEventListener('click', (e) => {
                buttonGeneratesitePrompt.classList.add('lab-busy');
                sitePromptContainer.classList.add('lab-busy');
                const customParams = {
                    specificInstuction: this.promptInstructions.feature.sitePrompt.specificInstruction[feature] || ''
                };
                customParams.siteName = '';

                this.configSite = lab_api.v1.config.get('labradorAi', { site: this.site });
                customParams.siteName = document.getElementById('input-globalSettings.siteName').value || '';

                if (customParams.siteName === '' && this.configSite && this.configSite.globalSettings && this.configSite.globalSettings.siteName) {
                    customParams.siteName = this.configSite.globalSettings.siteName;
                }
                if (customParams.siteName === '') {
                    customParams.siteName = this.labradorAi.getSiteInfo(this.site).display_name || this.labradorAi.getSiteInfo(this.site).alias;
                }

                const promptConfig = this.getSitePromptConfig(feature, customParams);
                // const promptConfig = this.getSitePromptConfig(feature);
                const prompt = this.labradorAi.getPrompt(promptConfig, {});
                const aiSettings = this.labradorAi.getAiSettings(promptConfig);

                this.labradorAi.requestGeneration(prompt, aiSettings).then((result) => {
                    buttonGeneratesitePrompt.classList.remove('lab-busy');
                    sitePromptContainer.classList.remove('lab-busy');

                    const modelFields = JSON.parse(this.labradorAi.cleanUpJsonString(result));

                    if (modelFields.error) {
                        Sys.logger.warn(`[Labrador Ai - ${ feature }] Error generating content:`, modelFields.error);
                    } else if (modelFields.promptSite) {
                        // Update the promptSite field with the generated prompt
                        const sitePromptField = promptSiteArea.querySelector(`.lab-item[data-path="${ feature }.promptSite"] textarea`);
                        sitePromptField.value = modelFields.promptSite;

                        // This is a hack to trigger the change event - should be able to override a 'state'-value in future admin API upgrade
                        const event = new Event('change');
                        sitePromptField.dispatchEvent(event);
                    }

                });
            });
            sitePromptContainer.appendChild(buttonGeneratesitePrompt);

            // Insert the new div at the beginning of the parent container
            promptSiteArea.insertBefore(sitePromptContainer, promptSiteArea.firstChild);
            // container.insertBefore(buttonGeneratesitePrompt, promptSiteArea);

        }

        let testPromptController = container.querySelector('.prompt-test-controller');
        if (!testPromptController && this.promptInstructions.feature[feature].disableTestInAdmin !== true) {
            testPromptController = document.createElement('div');
            testPromptController.classList.add('prompt-test-controller');
            container.appendChild(testPromptController);
        }

        let testPromptArea = container.querySelector('.prompt-test-area');
        if (!testPromptArea && this.promptInstructions.feature[feature].disableTestInAdmin !== true) {
            testPromptArea = document.createElement('div');
            testPromptArea.textContent = 'Test your own AI instructions with an article id and compare the result with the default Labrador AI';
            testPromptArea.classList.add('prompt-test-area');
            container.appendChild(testPromptArea);
        }

        // this.updateLanguageSelector(feature);

        let testPromptElement = container.querySelector('.prompt-test');
        if (!testPromptElement && this.promptInstructions.feature[feature].disableTestInAdmin !== true) {
            testPromptElement = document.createElement('div');
            testPromptElement.classList.add('prompt-test');
            testPromptElement.classList.add('lab-item');

            const testButton = document.createElement('button');
            testButton.classList.add('lab-generate');
            const idField = document.createElement('input');

            idField.type = 'text';
            idField.placeholder = 'Use an article id to test the instructions';
            idField.classList.add('prompt-id');
            testButton.innerText = 'Test instructions';
            testButton.addEventListener('click', (e) => {
                testPromptArea.textContent = '';
                testButton.classList.add('lab-busy');
                sitePromptContainer.classList.add('lab-busy');
                const id = idField.value;
                let previewContent = container.querySelector('.prompt-test-content');
                if (!previewContent) {
                    previewContent = document.createElement('div');
                    previewContent.classList.add('prompt-test-content');

                    testPromptArea.appendChild(previewContent);
                }

                let previewContentBase = container.querySelector('.prompt-test-content-base');
                if (!previewContentBase) {
                    previewContentBase = document.createElement('div');
                    previewContentBase.classList.add('prompt-test-content-base');

                    testPromptArea.appendChild(previewContentBase);
                }

                this.fetchArticleById(id)
                    .then((articleFields) => {
                        if (articleFields && articleFields.error) {
                            testButton.classList.remove('lab-busy');
                            sitePromptContainer.classList.remove('lab-busy');

                            previewContent.innerHTML = `<p>Error: <em>${ articleFields.error }</em></p>`;
                        } else if (articleFields) {
                            const previewContentAreas = {
                                previewContent,
                                previewContentBase
                            };
                            for (const p of ['previewContent', 'previewContentBase']) {
                                const previewArea = previewContentAreas[p];
                                const params = this.params.data[feature] || {};
                                const customParams = this.params.data[feature];
                                params.siteAlias = this.site;
                                this.configSite = lab_api.v1.config.get('labradorAi', { site: this.site });

                                params.siteName = this.globalSiteName || this.labradorAi.getSiteInfo(this.site).display_name || this.labradorAi.getSiteInfo(this.site).alias || this.site;

                                params.featureName = feature;
                                params.emptySitePromptForDemo = false;
                                if (p === 'previewContentBase') {
                                    params.emptySitePromptForDemo = true;

                                }

                                const promptConfig = this.labradorAi.getPromptConfig(params, customParams);
                                const prompt = this.labradorAi.getPrompt(promptConfig, articleFields);
                                const aiSettings = this.labradorAi.getAiSettings(promptConfig);

                                this.labradorAi.requestGeneration(prompt, aiSettings)
                                    .then((result) => {
                                        testButton.classList.remove('lab-busy');
                                        sitePromptContainer.classList.remove('lab-busy');

                                        const modelFields = JSON.parse(this.labradorAi.cleanUpJsonString(result));
                                        previewArea.innerHTML = '';
                                        if (p === 'previewContent') {
                                            previewArea.innerHTML = '<h3>Result with your AI instructions</h3>';
                                        }
                                        if (p === 'previewContentBase') {
                                            previewArea.innerHTML = '<h3>Result with default Labrador AI</h3>';
                                        }
                                        for (const key of Object.keys(modelFields)) {
                                            if (key === 'title') {
                                                previewArea.innerHTML += `<h2>${ modelFields[key] }</h2>`;
                                            } else if (key === 'bodytext') {
                                                previewArea.innerHTML += `${ modelFields[key] }`;
                                            } else if (key === 'error') {
                                                previewArea.innerHTML += `<p>Error: <em>${ modelFields[key] }</em></p>`;
                                            } else {
                                                previewArea.innerHTML += `<div>${ modelFields[key] }</div>`;
                                            }
                                        }

                                    })
                                    .catch((error) => {
                                        testButton.classList.remove('lab-busy');
                                        sitePromptContainer.classList.remove('lab-busy');

                                        previewContent.innerHTML = `<h2>Failed to generate content</h2><p><em>${ error }</em></p>`;
                                    });
                            }

                        }
                    })
                    .catch((error) => {
                        testButton.classList.remove('lab-busy');
                        sitePromptContainer.classList.remove('lab-busy');

                        previewContent.innerHTML = `<h2>Failed to fetch article</h2><p><em>${ error }</em></p>`;
                    });
            });

            const buttonDiv = document.createElement('div');
            buttonDiv.classList.add('prompt-test-id-button-container');

            buttonDiv.appendChild(testButton);
            testPromptElement.appendChild(buttonDiv);
            testPromptElement.appendChild(idField);
            testPromptController.appendChild(testPromptElement);
        }

        let previewElement = container.querySelector('.prompt-test');
        if (!previewElement) {
            previewElement = document.createElement('p');
            previewElement.classList.add('prompt-test');
            if (this.promptInstructions.feature[feature].disableTestInAdmin !== true) {
                testPromptArea.appendChild(previewElement);
            }
        }
    }

    handleModifiedData(data, modifiedPaths, site) {
        /**
         * Handle modified data for each feature by updating the settings input fields and feature containers
         * @param {object} data - The modified data
         * @param {array} modifiedPaths - The paths that have been modified
         * @param {string} site - The site alias
         */
        this.site = site;
        if (!modifiedPaths || modifiedPaths.length === 0) {
            return;
        }

        for (const feature of Object.keys(this.promptInstructions.feature)) {
            const featureContainer = document.querySelector(`.lab-item-container[data-path="${ feature }"]`);
            if (featureContainer) {
                if (this.features.includes(feature)) {
                    this.updateFeatureContainer(feature);
                }

            }
        }
    }

    fetchArticleById(id) {
        /**
         * Use the labrador api to fetch article by id
         * @param {string} id - The article id
         */
        if (!/^\d+$/.test(id)) {
            return Promise.resolve({ error: 'Invalid labrador article id' });
        }
        return new Promise((resolve, reject) => {
            const url = `/api/v1/article/?query=id:${ id }`;
            fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        reject(response.statusText);
                    }
                    return response.json();
                })
                .then((resp) => {
                    if (!resp.result) {
                        resolve({ error: 'No response from server' });
                    }
                    if (resp.result.length === 0) {
                        resolve({ error: 'No article found' });
                    }
                    resolve(resp.result[0]);

                })
                .catch((err) => {
                    resolve({ error: err });
                });
        });

    }

    populateGlobalDefaultSelectors() {
        // Get saved values from params.data
        const savedDefaultTextModel = this.params.data?.globalSettings?.defaultTextModel;
        const savedDefaultImageModel = this.params.data?.globalSettings?.defaultImageModel;

        // Populate default text model dropdown
        const defaultTextModelSelect = document.querySelector('select#input-globalSettings\\.defaultTextModel');
        if (defaultTextModelSelect && defaultTextModelSelect.dataset.labradorPopulated !== 'true') {
            const textModels = this.aiModels.getModelsByCapability('text');
            const currentValue = savedDefaultTextModel || defaultTextModelSelect.value || 'openAi-gpt-5-4';

            const options = Object.entries(textModels).map(([key, model]) => {
                const selected = key === currentValue ? ' selected' : '';
                return `<option value="${key}"${selected}>${model.label}</option>`;
            });

            defaultTextModelSelect.innerHTML = options.join('');
            defaultTextModelSelect.dataset.labradorPopulated = 'true';
        }

        // Populate default image model dropdown
        const defaultImageModelSelect = document.querySelector('select#input-globalSettings\\.defaultImageModel');
        if (defaultImageModelSelect && defaultImageModelSelect.dataset.labradorPopulated !== 'true') {
            const imageModels = this.aiModels.getModelsByCapability('image');
            const currentValue = savedDefaultImageModel || defaultImageModelSelect.value || 'openAi-gpt-5-4';

            const options = Object.entries(imageModels).map(([key, model]) => {
                const selected = key === currentValue ? ' selected' : '';
                return `<option value="${key}"${selected}>${model.label}</option>`;
            });

            defaultImageModelSelect.innerHTML = options.join('');
            defaultImageModelSelect.dataset.labradorPopulated = 'true';
        }
    }

    updateLanguageSelector(feature, selectLang) {
        /**
         * Update the language selector for a feature
         * @param {string} feature - The feature name
         * @param {string} selectLang - The selected language to be seen in the dropdown
         */
        const container = document.querySelector(`.lab-item-container[data-path="${ feature }"]`);

        const languageElement = container.querySelector(`.lab-item[data-path="${ feature }.language"] select`);
        if (!languageElement) {
            return;
        }
        const { sitename } = this.params;
        this.contentLanguages = this.labradorAi.getContentLanguages();
        const langCode = this.params.data[feature]?.language || selectLang || lab_api.v1.config.get('contentLanguage', { site: sitename });
        const options = this.contentLanguages.map((lang) => `<option value="${ lang.code }"${ lang.code === langCode ? ' selected="selected"' : '' }>${ lang.name }</option>`);
        languageElement.innerHTML = `${ options }`;
        languageElement.addEventListener('change', (event) => {
            this.currentLanguage = languageElement.value;
            this.updateLanguageSelector(feature, this.currentLanguage);
        });
    }

    waitForElement(selector, timeout = 8000) {
        /**
         * Wait for an element to appear in the DOM
         * @param {string} selector - CSS selector for the element to wait for
         * @param {number} timeout - Maximum time to wait in milliseconds (default: 8000)
         * @returns {Promise<Element|null>} Promise that resolves with the element or null if timeout
         */
        return new Promise((resolve) => {
            // Check if element already exists
            const existing = document.querySelector(selector);
            if (existing) {
                return resolve(existing);
            }

            // Create observer to watch for the element
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Set up timeout
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    waitForViewConfigLoad() {
        /**
         * Wait for the specific /api/v2/config-object/viewConfig request to complete
         * and for the DOM elements to be ready
         * Uses PerformanceObserver to detect the network request, then waits for DOM elements
         * @returns {Promise<void>} Promise that resolves when the API call completes and DOM is ready
         */
        return new Promise((resolve) => {
            // Check if request already completed
            const existingEntries = performance.getEntriesByType('resource');
            const viewConfigEntry = existingEntries.find(entry =>
                entry.name.includes('/api/v2/config-object/viewConfig')
            );

            if (viewConfigEntry) {
                // Already loaded, wait for DOM element to be ready
                this.waitForElement('select#input-globalSettings\\.defaultTextModel').then(() => resolve());
                return;
            }

            // Create observer for new network requests
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name.includes('/api/v2/config-object/viewConfig')) {
                        observer.disconnect();
                        // Wait for DOM element to be ready after API response
                        this.waitForElement('select#input-globalSettings\\.defaultTextModel').then(() => resolve());
                        return;
                    }
                }
            });

            try {
                observer.observe({ entryTypes: ['resource'] });
            } catch (e) {
                setTimeout(resolve, 2000);
                return;
            }

            // Timeout after 10 seconds
            setTimeout(() => {
                observer.disconnect();
                resolve();
            }, 10000);
        });
    }

    async updateAiProviderDropdowns() {
        // Dynamically update AI provider dropdowns from aiModels.json
        // Note: ensureInitialized() is called in initializeDropdowns() before this method
        const adminConfigFeatures = lab_api.v1.config.getConfig(`pages.labradorAi.data.items`);
        if (!adminConfigFeatures) {
            return;
        }

        const featureNames = Object.keys(adminConfigFeatures).filter(name => name !== 'globalSettings');

        // Wait for the viewConfig API call to complete and DOM to update
        await this.waitForViewConfigLoad();

        // Populate global selectors first
        this.populateGlobalDefaultSelectors();

        // Populate feature selectors
        for (const feature of featureNames) {
            const featureConfig = adminConfigFeatures[feature];
            if (!featureConfig?.items?.aiProvider) {
                continue;
            }

            const providerSelect = document.querySelector(`select#input-${feature}\\.aiProvider`);
            if (!providerSelect) {
                continue;
            }

            // Prevent overwriting or re-initializing
            if (providerSelect.dataset.labradorPopulated === 'true') {
                continue;
            }
            providerSelect.dataset.labradorPopulated = 'true';

            const capability = featureConfig.imageModels === true ? 'image' : 'text';
            const savedValue = this.params.data?.[feature]?.aiProvider;
            const currentValue = savedValue || providerSelect.value || 'default';
            const models = this.aiModels.getModelsByCapability(capability);

            const isDefaultSelected = currentValue === 'default' || !currentValue ? ' selected' : '';
            const options = [`<option value="default"${isDefaultSelected}>Default (uses global setting)</option>`];

            options.push(...Object.entries(models).map(([key, model]) => {
                const selected = key === currentValue ? ' selected' : '';
                return `<option value="${key}"${selected}>${model.label}</option>`;
            }));

            providerSelect.innerHTML = options.join('');
        }
    }

}
