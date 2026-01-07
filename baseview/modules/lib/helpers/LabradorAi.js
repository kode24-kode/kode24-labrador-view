import contentLanguages from './ContentLanguages.js';

/**
 * Add retry-method for generating content ()
 */

export class LabradorAi {

    /**
     * Labrador AI helper class for the TextAssistant plugin
     * The Labrador AI helper class will handle the configuration and generation of content from Labrador AI
     * Methods are used both from admin page 'Labrador AI' as well as from contextual menues through the TextAssistant plugin
     * The Labrador AI helper class will also handle a generalised settings modal for the AI feature
     * @param {*} api Labrador API
     * @param {*} rootModel Uppermost parent model
     */

    constructor(api, rootModel) {
        this.api = api;
        this.rootModel = rootModel;
        this.promptInstructions = this.api.v1.config.get('promptInstructions');
        this.siteInfo = this.getSiteInfo();
    }

    getSiteInfo(sitealias = null) {
        /**
         * Get the alias of the current site
         */
        let site;
        if (sitealias) {
            site = this.api.v1.site.getSite(sitealias);
        } else {
            site = this.api.v1.site.getSite();
        }
        if (site) {
            const siteInfo = {
                alias: site.alias
            };
            if (site.display_name && site.display_name.length > 0 && site.display_name !== site.alias) {
                siteInfo.display_name = site.display_name;
            }
            if (site.domain && site.domain.length > 0) {
                siteInfo.domain = site.domain;
            }
            return siteInfo;
        }
        return null;
    }

    getPromptConfig(featureParams = null, customParams = null) {
        /**
         * Get the prompt configuration for the current feature, as defined in admin page Labrador AI for the current site
         * @param {Object} featureParams - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         * @param {Object} customParams - The custom field values to override the default values (like fields stored on a factbox-element)
         */

        // Admin config values for Labrador AI to be used as default values
        this.configAdmin = this.api.v1.config.getConfig(`pages.labradorAi.data.items.${ featureParams.featureName }`);
        const featureItems = this.configAdmin?.items || {};
        for (const promptLevel of ['promptBase', 'promptSite', 'promptPage']) {
            if (featureItems[promptLevel] && featureItems[promptLevel].defaultValue) {
                featureItems[promptLevel] = featureItems[promptLevel].defaultValue;
            }
            if (!featureItems[promptLevel]) {
                featureItems[promptLevel] = '';
            }
        }

        // Site specific config values (as overridden in Admin page 'Labrador AI')
        let siteItems;
        this.siteAlias = featureParams.siteAlias || this.siteInfo.alias;
        this.configSite = this.api.v1.config.get('labradorAi', { site: this.siteAlias });
        if (this.configSite) {
            siteItems = this.configSite[featureParams.featureName];
        }

        // Config from 'Prompt instructions' for the current feature
        this.promptInstructionsFeature = null;
        if (this.promptInstructions && this.promptInstructions.feature && this.promptInstructions.feature[featureParams.featureName]) {
            this.promptInstructionsFeature = this.promptInstructions.feature[featureParams.featureName];
        }

        if (this.promptInstructionsFeature && this.promptInstructionsFeature.items) {
            for (const item of Object.keys(this.promptInstructionsFeature.items)) {
                featureItems[item] = this.promptInstructionsFeature.items[item];
            }
        }
        // CustomParams, like fields stored on a Labrador-model
        if (customParams) {
            for (const param of Object.keys(customParams)) {
                if (!featureItems[param]) {
                    featureItems[param] = featureParams[param];
                }
            }
        }

        let promptConfig = {
            siteLanguage: this.getPageLanguage(this.siteAlias, 'code', false),
            pageLanguage: this.getPageLanguage(this.siteAlias, 'code', true),
            siteAlias: this.siteAlias,
            siteDomain: this.siteInfo.domain,
            siteName: this.siteInfo.display_name || this.siteAlias
        };
        if (this.configSite && this.configSite.globalSettings && this.configSite.globalSettings.siteName && this.configSite.globalSettings.siteName.length > 0) {
            promptConfig.siteName = this.configSite.globalSettings.siteName;
        }

        /**
         * promptConfig priority/fallback:
         * 1. Article/model config
         * 2. Site config
         * 3. Prompt instructions config
         * 4. Admin config (default values)
         */
        if (featureItems) {
            for (const item of Object.keys(featureItems)) {
                // Admin: Default values from admin config

                if (featureItems[item] && featureItems[item].defaultValue) {
                    promptConfig[item] = featureItems[item].defaultValue;
                }
                if (promptConfig[item] === '' && featureItems[item]?.contentType === 'checkbox') {
                    promptConfig[item] = false;
                }

                // Prompt-config: If prompt instruction has a defined value, then use it
                if (this.promptInstructionsFeature && this.promptInstructionsFeature[item]) {
                    promptConfig[item] = this.promptInstructionsFeature[item];
                }

                // Site: If site config has a defined value, then use it
                if (siteItems && siteItems[item]) {
                    promptConfig[item] = siteItems[item];
                }

                // Model: If article or feature element has defined values, then use them
                if (customParams && customParams[item] !== undefined && !['promptBase'].includes(item)) {
                    promptConfig[item] = customParams[item];
                }

            }
        }

        if (featureParams && featureParams.emptySitePromptForDemo && featureParams.emptySitePromptForDemo === true) {
            promptConfig.promptSite = '';
        }

        // Update language in promptConfig
        promptConfig = this.updateLanguageInConfig(promptConfig);

        // Add general instructions in prompt-config to promptConfig
        for (const instruction of Object.keys(this.promptInstructions.general)) {
            promptConfig[instruction] = this.promptInstructions.general[instruction];
        }

        return promptConfig;
    }

    updateLanguageInConfig(config) {
        /**
         * Update the language in the prompt configuration
         * Priority: customLanguage > language > siteLanguage
         * CustomLanguage is a custom string defining the language set in the prompt instructions
         * @param {Object} config - The prompt configuration to update the language in
         */

        const promptConfig = config;
        if (promptConfig.specifyLanguage && (promptConfig.specifyLanguage === 'true' || promptConfig.specifyLanguage === true)) {
            promptConfig.languageName = this.getLanguageNameByCode(promptConfig.languageContent);
            promptConfig.languageCode = promptConfig.languageContent;
        } else if (promptConfig.languageSiteSetting === 'siteLanguage') {
            promptConfig.languageName = this.getPageLanguage(promptConfig.siteAlias, 'name', true);
            promptConfig.languageCode = this.getPageLanguage(promptConfig.siteAlias, 'code', true);
        } else {
            // Default to seo language or site language if nothing is specified
            promptConfig.languageName = this.getPageLanguage(promptConfig.siteAlias, 'name', true);
            promptConfig.languageCode = this.getPageLanguage(promptConfig.siteAlias, 'code', true);
        }
        return promptConfig;
    }

    getAiSettings(promptConfig, params = {}) {
        /**
         * Get the AI settings for the current feature, as defined in admin page Labrador AI for the current site.
         * Passed on to backend AI integration for generation of content
         * Default to provider/model set in 'prompt instructions'-config
         * @param {Object} promptConfig - The prompt configuration to get the AI settings for
         */

        // Use customer defined provider, if set in promptConfig
        if (promptConfig?.aiProvider && this.promptInstructions?.aiProvider && this.promptInstructions.aiProvider[promptConfig.aiProvider]) {
            return this.promptInstructions.aiProvider[promptConfig.aiProvider];
        }

        // Fallback to default provider, as set in "prompt instructions"
        if (this.promptInstructionsFeature?.providerDefault && this.promptInstructions.aiProvider[this.promptInstructionsFeature.providerDefault]) {
            return this.promptInstructions.aiProvider[this.promptInstructionsFeature.providerDefault];
        }

        const defaultAiProvider = 'openAi-gpt4o';

        const aiProvider = this.promptInstructions.aiProvider[defaultAiProvider];
        aiProvider.searchForKeywords = promptConfig.searchForKeywords || [];
        aiProvider.featureName = params.featureName || '';
        return aiProvider;
    }

    getOriginalContent(labradorModel, fields) {
        /**
         * Get the original content of the article, to be used as a base or context for the prompt
         */
        const originalContent = {};
        for (const field of fields) {
            const fieldContent = labradorModel.get(`fields.${ field }`);
            if (fieldContent && fieldContent.length > 0) {
                originalContent[field] = fieldContent;
            }

        }
        return originalContent;
    }

    prepareCustomParams(labradorModel, params = {}) {
        /**
         * Prepare custom parameters for the prompt, based on the fields stored on the Labrador element-model
         *
         * This method is used to fetch stored data in the fields of the Labrador element-model
         * @param {Object} labradorModel - The Labrador element-model
         * @param {Object} params - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         */
        const customParams = params;
        if (labradorModel) {
            this.configAdmin = this.api.v1.config.getConfig(`pages.labradorAi.data.items.${ params.featureName }`);
            if (this.configAdmin && this.configAdmin.items) {
                const configItems = Object.keys(this.configAdmin.items);
                if (this.promptInstructionsFeature && this.promptInstructionsFeature.items) {
                    for (const item of Object.keys(this.promptInstructionsFeature.items)) {
                        if (!configItems.includes(item)) {
                            configItems.push(item);
                        }
                    }
                }
                for (const item of configItems) {
                    // Get stored fields from the model
                    const customSetting = labradorModel.get(`fields.labradorAi_${ params.featureName }_${ item }`, null, true);

                    // Exception for promptPage, due to sending empty strings
                    if (item === 'promptPage' && customSetting !== undefined) {
                        customParams[item] = customSetting;
                    }

                    if (customSetting !== undefined && customSetting.length > 0) {
                        if (customSetting === 'true') {
                            customParams[item] = true;

                        } else if (customSetting === 'false') {
                            customParams[item] = false;
                        } else {
                            customParams[item] = customSetting;
                        }
                    }

                }
            }
        }
        return customParams;
    }

    getPrompt(promptConfig, originalFields = null) {
        /**
         * Get the prompt for the current feature, as defined by config in admin page Labrador AI for the current site
         * @param {Object} promptConfig - The prompt configuration to render the prompt with
         * @param {Object} originalFields - The original fields of the article to use as context for the prompt
         */

        if (!promptConfig) {
            return '';
        }
        const config = promptConfig;
        let fields = originalFields;
        if (!fields) {
            fields = this.getOriginalContent(this.rootModel, ['title', 'subtitle', 'bodytext', 'modified', 'created', 'published']);
        }

        // Get the original content of the article
        if (fields) {
            for (const field of Object.keys(fields)) {
                // Handle date format
                if (field === 'created' || field === 'modified' || field === 'published') {
                    const timestamp = Number(fields[field]) * 1000;
                    if (timestamp) {
                        fields[field] = new Date(timestamp);
                    }

                }
                if (fields[field]) {
                    config[`original_${ field }`] = fields[field];
                }
            }
        }

        // Build the unrendered prompt
        let unRenderedPrompt = config.promptBase;

        // Add site prompt
        if ((config.promptSite && config.promptSite.length > 0) || (config.promptPage && config.promptPage.length > 0)) {
            unRenderedPrompt += `\n In particular, it is extremly important to follow these instructions: \n`;

            if (config.promptSite && config.promptSite.length > 0) {
                unRenderedPrompt += `- ${ config.promptSite }\n`;
            }

            if (config.promptPage && config.promptPage.length > 0) {
                unRenderedPrompt += `- ${ config.promptPage }\n`;
            }
        }

        // Add general error handling
        /*
        if (config.errorResponse && config.errorResponse.length > 0) {
            unRenderedPrompt += config.errorResponse;
        } */

        // Add original article content (context)
        if (fields && config.originalContent) {
            unRenderedPrompt += config.originalContent;
        }

        const prompt = this.api.v1.util.dom.renderTemplate(unRenderedPrompt, { params: config });
        return prompt;
    }

    getDefaultAiSettingsTemplate() {
        /**
         * Get the default template for the AI feature settings modal
         * The template will be used to render the settings modal for the AI feature
         */
        return `
        {{#formFields}}
            {{#showInGeneral}}
                {{#isTextarea}}
                    <div class="lab-formgroup lab-grid-gap lab-grid-large-12 lab-grid-small-12">
                            <label for="{{key}}"><b>{{label}}</b></label>
                            <textarea id="{{key}}" class="featureSetting" name="{{key}}" placeholder="{{placeholder}}" style="height: 100px;">{{defaultValue}}</textarea>
                    </div>
                {{/isTextarea}}

                {{#isSelect}}
                <div class="lab-formgroup lab-grid-gap lab-grid-large-6 lab-grid-small-12">

                    <label for="{{key}}"><b>{{label}}</b></label>
                    <select id="{{key}}" name="{{key}}" class="featureSetting">
                        {{#options}}
                        <option value="{{value}}" {{#isSelected}}selected{{/isSelected}}>{{label}}</option>
                        {{/options}}
                    </select>
                </div>
                {{/isSelect}}

                {{#isInput}}
                <div class="lab-formgroup lab-grid-gap lab-grid-large-6 lab-grid-small-12">

                    <label for="{{key}}"><b>{{label}}</b></label>
                    {{#isCheckbox}}
                    <input type="checkbox" id="{{key}}" name="{{key}}" class="featureSetting" {{#defaultValue}}checked{{/defaultValue}}>
                    {{/isCheckbox}}

                    {{^isCheckbox}}
                    <input type="{{contentType}}" id="{{key}}" name="{{key}}" class="featureSetting" placeholder="{{placeholder}}" value="{{defaultValue}}">
                    {{/isCheckbox}}
                </div>
                {{/isInput}}
            {{/showInGeneral}}
        {{/formFields}}

        <div class="settings-container">
            <div id="toggle-advanced-btn" class="lab-btn text-completion lab-is-clickable" currentstate="hidden">Show Advanced Settings</div>
            {{#formFields}}
            <div class="advanced-setting lab-formgroup lab-grid-gap lab-grid-large-4 lab-grid-small-12 lab-hidden">
                {{#showInAdvanced}}
                    {{#isSelect}}
                    <label for="{{key}}"><b>{{label}}</b></label>
                    <select id="{{key}}" name="{{key}}" class="featureSetting">
                        {{#options}}
                        <option value="{{value}}" {{#isSelected}}selected{{/isSelected}}>{{label}}</option>
                        {{/options}}
                    </select>
                    {{/isSelect}}
            
                    {{#isInput}}
                    <label for="{{key}}"><b>{{label}}</b></label>
                        {{#isCheckbox}}
                        <input type="checkbox" id="{{key}}" name="{{key}}" class="featureSetting" {{#defaultValue}}checked{{/defaultValue}}>
                        {{/isCheckbox}}
            
                        {{^isCheckbox}}
                        <input type="{{contentType}}" id="{{key}}" name="{{key}}" class="featureSetting" placeholder="{{placeholder}}" value="{{defaultValue}}">
                        {{/isCheckbox}}
                    {{/isInput}}
                {{/showInAdvanced}}
            </div>
            {{/formFields}}
        </div>`;
    }

    setupTemplateConfig(params, adminConfigFeature, pageConfigFeature) {
        /**
         * Setup the template configuration for the AI feature settings modal
         * The template configuration will be used to render the settings modal for the AI feature
         * @param {Object} params - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         * @param {Object} adminConfigFeature - The configuration for the AI feature settings from the admin page 'Labrador AI'
         */
        const { featureName } = params;

        const templateConfigItems = adminConfigFeature.items;

        // Add items available from settings modal on page (if not already set in admin config)
        if (pageConfigFeature && pageConfigFeature.items) {
            for (const item of Object.keys(pageConfigFeature.items)) {
                if (!templateConfigItems[item]) {
                    templateConfigItems[item] = pageConfigFeature.items[item];
                }
            }
        }

        const customParams = {};
        for (const item of Object.keys(templateConfigItems)) {

            // If model value is set, then use that
            const modelValue = this.labradorModel.get(`fields.labradorAi_${ featureName }_${ item }`, null, true);
            if (modelValue !== undefined) {
                customParams[item] = modelValue;
            }
        }

        const promptConfig = this.getPromptConfig(params, customParams);
        for (const item of Object.keys(templateConfigItems)) {
            if (promptConfig[item]) {
                templateConfigItems[item].defaultValue = promptConfig[item];
            }

            // If model value is set, then use that
            const modelValue = this.labradorModel.get(`fields.labradorAi_${ featureName }_${ item }`);

            if (modelValue) {
                templateConfigItems[item].defaultValue = modelValue;
            } else if (item === 'promptPage') {
                templateConfigItems[item].defaultValue = '';
            }
        }

        // Handle special case model, model depends on selected provider
        /*
        if (!templateConfigItems.model.defaultValue || templateConfigItems.model.defaultValue.length === 0) {
            if (!templateConfigItems.provider.defaultValue) {
                // Add placeholder for model
                const { providerDefault } = this.promptInstructions.feature[featureName];
                templateConfigItems.model.defaultValue = this.promptInstructions.feature[featureName].providerSettings[providerDefault].model;
            } else {
                templateConfigItems.model.defaultValue = this.promptInstructions.feature[featureName].providerSettings[templateConfigItems.provider.defaultValue].model;
            }
            promptConfig.model = templateConfigItems.model.defaultValue;
        }
            */

        // option for language, fetch language list set that to "options"
        if (templateConfigItems.languageContent) {
            const initialLanguage = promptConfig.languageCode || this.getPageLanguage(params.siteAlias, 'code', true);
            const languages = contentLanguages.map((language) => ({ label: language.name, value: language.code, selected: language.code === initialLanguage }));
            templateConfigItems.languageContent.options = languages;
            templateConfigItems.languageContent.defaultValue = initialLanguage;
        }
        return [templateConfigItems, promptConfig];
    }

    setupTemplateParams(templateConfigItems) {
        /**
         * Setup the template parameters for the AI feature settings modal
         * Form fields are used as template parameters in the AI feature settings modal
         * @param {Object} templateConfigItems - The configuration items for the AI feature settings
         */

        const formFields = Object.entries(templateConfigItems).map(([key, value]) => ({
            key,
            label: value.label || '',
            showInGeneral: ((!value.adminSettingOnly || value.adminSettingOnly === false) && (!value.advanced || value.advanced === false)) || false,
            showInAdvanced: ((!value.adminSettingOnly || value.adminSettingOnly === false) && (value.advanced && value.advanced === true)) || false,
            placeholder: value.placeholder || '',
            contentType: value.contentType || 'text',
            defaultValue: (value.contentType === 'checkbox' && (value.defaultValue === false || value.defaultValue === 'false')) ? null : value.defaultValue,
            options: (value.options || []).map((option) => ({
                ...option,
                isSelected: option.value === value.defaultValue // Check if this option should be selected
            })),
            isTextarea: value.contentType === 'textarea',
            isSelect: value.contentType === 'select',
            isInput: !['textarea', 'select'].includes(value.contentType),
            isCheckbox: value.contentType === 'checkbox' // Check if this is a checkbox

        }));
        return formFields;
    }

    openFeatureSettings(labradorModel, labradorView, labradorItem, params) {
        /**
         * Open the settings modal for the AI feature
         * The settings modal will allow the user to configure the AI feature for the current article
         * The settings will be stored on the Labrador element-model
         * The settings will be used as parameters for the prompt to generate content with Labrador AI
         * @param {Object} labradorModel - The Labrador element-model
         * @param {Object} params - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         */
        this.labradorModel = labradorModel;

        // Get the feature settings from the admin page Labrador AI, define feature-config and modal html-template
        const adminConfigFeature = this.api.v1.config.getConfig(`pages.labradorAi.data.items.${ params.featureName }`);
        const pageConfigFeature = this.promptInstructions.feature[params.featureName];
        const [templateConfigItems, promptConfig] = this.setupTemplateConfig(params, adminConfigFeature, pageConfigFeature);
        const templateParams = this.setupTemplateParams(templateConfigItems);
        const template = this.getDefaultAiSettingsTemplate();

        // Render the modal with the feature settings
        const markup = this.api.v1.util.dom.renderTemplate(template, { formFields: templateParams });
        this.api.v1.ui.modal.dialog({
            container: {
                css: 'baseview-textcompletion'
            },
            content: {
                header: `${ adminConfigFeature.label } settings`,
                markup: `<p><b>${ adminConfigFeature.description }</b></p>
                <p>Configured settings will affect the '${ adminConfigFeature.label }'-feature for <em>this</em> article. To change the settings for <em>all</em> articles, go to the <a href="/settings/cp?page=labradorAi">Labrador AI admin page.</a></p>
                <div class="lab-grid">${ markup }</div>`
            },
            callbacks: {
                didDisplay: (modal) => {
                    const modalMarkup = modal.getMarkup();

                    const languageSetting = modalMarkup.querySelector('#languageSiteSetting');
                    const languageContent = modalMarkup.querySelector('#languageContent');

                    if (promptConfig.specifyLanguage && promptConfig.specifyLanguage === 'true' && languageSetting) {
                        // Language setting, as set in admin
                        languageSetting.setAttribute('disabled', true);
                        languageSetting.parentElement.classList.add('lab-disabled');

                        // Optional language selection
                        languageContent.removeAttribute('disabled');
                        languageContent.parentElement.classList.remove('lab-disabled');

                    } else if (languageSetting) {
                        languageSetting.removeAttribute('disabled');
                        languageSetting.parentElement.classList.remove('lab-disabled');

                        // Optional language selection
                        languageContent.setAttribute('disabled', true);
                        languageContent.parentElement.classList.add('lab-disabled');
                    }
                    if (params && params.disableGenerateButton) {
                        const generateButton = modalMarkup.querySelector('.lab-generate');
                        generateButton.style.display = 'none';
                    }
                }

            },
            eventHandlers: [{
                selector: '#toggle-advanced-btn',
                event: 'click',
                callback: (modal, event) => {

                    const button = document.getElementById('toggle-advanced-btn');
                    const currentState = button.getAttribute('currentstate');
                    if (currentState && currentState === 'hidden') {
                        button.setAttribute('currentstate', 'open');
                        button.textContent = 'Hide Advanced Settings';
                    } else {
                        button.setAttribute('currentstate', 'hidden');
                        button.textContent = 'Show Advanced Settings';
                    }

                    const advancedSettings = document.querySelectorAll('.advanced-setting');
                    for (const setting of advancedSettings) {
                        if (setting.classList.contains('lab-hidden')) {
                            setting.classList.remove('lab-hidden');
                        } else {
                            setting.classList.add('lab-hidden');
                        }
                    }
                }
            },
            {
                selector: 'input[type="checkbox"]',
                event: 'click',
                callback: (modal, event) => {
                    const checkboxElement = event.target;
                    if (event.target.checked === true) {
                        checkboxElement.setAttribute('checked', true);
                    } else {
                        checkboxElement.setAttribute('checked', false);
                    }

                    if (checkboxElement.id === 'specifyLanguage') {
                        const languageSetting = document.getElementById('languageSiteSetting');
                        const languageContent = document.getElementById('languageContent');
                        if (checkboxElement.checked === true) {
                            languageSetting.setAttribute('disabled', true);
                            languageSetting.parentElement.classList.add('lab-disabled');

                            // Optional language selection
                            languageContent.removeAttribute('disabled');
                            languageContent.parentElement.classList.remove('lab-disabled');
                        } else {
                            languageSetting.removeAttribute('disabled');
                            languageSetting.parentElement.classList.remove('lab-disabled');

                            // Optional language selection
                            languageContent.setAttribute('disabled', true);
                            languageContent.parentElement.classList.add('lab-disabled');
                        }
                    }
                }
            },
            {
                selector: '#save-ai-feature-settings',
                event: 'click',
                callback: (modal, event) => {
                    const featureSettingElements = document.querySelectorAll('.featureSetting');
                    this.updateFeatureParamsFromSettings(featureSettingElements, params, promptConfig);

                    modal.close();
                }
            },
            {
                selector: '#generate-ai-content',
                event: 'click',
                callback: (modal, event) => {
                    const featureSettingElements = document.querySelectorAll('.featureSetting');
                    this.updateFeatureParamsFromSettings(featureSettingElements, params, promptConfig);
                    this.api.v1.ns.get('textAssistant.generateContent')(this.labradorModel, labradorView, labradorItem, params);
                    modal.close();
                }
            }, {
                selector: '#button-close',
                event: 'click',
                callback: (modal, event) => {
                    modal.close();
                }
            }],
            footer: {
                buttons: [
                    {
                        value: 'Cancel',
                        type: 'button',
                        id: 'button-close',
                        highlight: false
                    },
                    {
                        value: 'Save',
                        type: 'button',
                        id: 'save-ai-feature-settings',
                        hightlight: true
                    },
                    {
                        value: 'Generate',
                        type: 'button',
                        id: 'generate-ai-content',
                        class: 'lab-generate'

                    }
                ]
            }
        });
    }

    requestGeneration(prompt, aiIntegrationSettings = { model: 'gpt-4o' }) {
        /**
         * Request generation of content from Labrador AI
         * @param {string} prompt - The rendered prompt to generate content from, includes instructions and context
         * @param {Object} aiIntegrationSettings - The settings to define parameters of the AI model
         */
        return new Promise((resolve, reject) => {
            const options = {
                prompt,
                service: 'chatCompletions',
                model: aiIntegrationSettings.model,
                aiSettings: aiIntegrationSettings,
                featureName: aiIntegrationSettings.featureName || ''
            };
            this.api.v1.generate.text(options).then((result) => {
                resolve(result);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    updateModelFields(model, view, fields, addLocalizedStringPath = false, setToRootModel = false, setToViewAiField = false) {
        /**
         * Update the Labrador element-model with the fields provided.
         * If addLocalizedStringPath is included, then append a localized string to the bodytext.
         * If setToRootModel is true, then update the root model as well
         * @param {Object} model - The Labrador element-model
         * @param {Object} fields - The fields to update the model with
         * @param {string} addLocalizedStringPath - The path to the localized string to append to the bodytext
         * @param {boolean} setToRootModel - If true, then update the root model as well
         * @param {boolean} setToViewAiField - If true, then update the view as well
         */
        let modelFields = fields;
        const parentViews = this.api.v1.view.getViews(this.rootModel);
        if (typeof modelFields !== 'object') {
            modelFields = JSON.parse(fields);
        }
        for (const field of Object.keys(modelFields)) {
            if (setToRootModel === true) {
                this.rootModel.set(`fields.${ field }`, modelFields[field]);
            }
            if (setToViewAiField === true) {
                for (const parentView of parentViews) {
                    parentView.set(`fields.${ field }`, modelFields[field]);
                }
            }
            model.set(`fields.${ field }`, modelFields[field]);
        }

        // Append localized string to bodytext
        if (addLocalizedStringPath) {
            this.appendLocalizedString(model, 'fields.bodytext', addLocalizedStringPath);
        }
    }

    preprocessGeneration(model, view, menuItem, params) {
        /**
         * Pre-process the generation of content from Labrador AI
         * @param {Object} model - The Labrador element-model
         * @param {Object} view - The view (element) to modify class names in
         * @param {Object} menuItem - The menu item that triggered the generation
         * @param {Object} params - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         */
        Sys.logger.debug(`[Labrador Ai - ${ params.featureName }]: Start preprocess of generateContent`);
        if (view) {
            this.modifyClassNamesInView(view, { add: ['lab-busy', 'lab-busy-top'] });
        }

        // Custom params are fields stored on the model
        const customParams = this.prepareCustomParams(model, params);

        // Config setup for prompt, priorities customParams over site/admin config
        const promptConfig = this.getPromptConfig(params, customParams);
        const prompt = this.getPrompt(promptConfig);
        const aiIntegrationSettings = this.getAiSettings(promptConfig, params);
        Sys.logger.debug(`[Labrador Ai - ${ params.featureName }]: Finished preprocess of generateContent`);

        return [prompt, aiIntegrationSettings];
    }

    postprocessGeneration(model, view, menuItem, params, result) {
        /**
         * Post-process the generated content from Labrador AI
         * @param {Object} model - The Labrador element-model
         * @param {Object} view - The view (element) to modify class names in
         * @param {Object} menuItem - The menu item that triggered the generation
         * @param {Object} params - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         * @param {string} result - The generated content from Labrador AI
         */
        Sys.logger.debug(`[Labrador Ai - ${ params.featureName }] Generated content successfully`);

        if (!params || typeof params !== 'object') {
            return result;
        }

        if (params.returnRawContent === true) {
            return result;
        }

        let modelFields = result;
        if (params.cleanUpJsonString === true || !params.cleanUpJsonString) {
            modelFields = this.cleanUpJsonString(result);
        }

        if (params.cleanUpJsonString && params.cleanUpJsonString === false) {
            return modelFields;
        }

        if (model && params.updateModel !== false) {
            const suffixString = params.localizedStringPath || false;
            const setToRootModel = params.setToRootModel || false;
            const setToViewAiField = params.setToViewAiField || false;
            this.updateModelFields(model, view, modelFields, suffixString, setToRootModel, setToViewAiField);
        }

        if (view && params.updateView !== false) {
            this.modifyClassNamesInView(view, { remove: ['lab-busy', 'lab-busy-top'] });
        }
        Sys.logger.debug(`[Labrador Ai - ${ params.featureName }] Finished post-process generation`);
        return modelFields;
    }

    cleanUpJsonString(data) {
        /**
         * Clean up the JSON string to be used for updating the Labrador element-model
         * @param {string} data - The JSON string to clean up
         */
        let jsonString = data.trim();

        if (jsonString.includes('{') && jsonString.indexOf('{') > 0) {
            jsonString = jsonString.substring(jsonString.indexOf('{'));
        }

        if (!jsonString.includes('{')) {
            jsonString = `{${ jsonString }`;
        }

        if (!jsonString.includes('}')) {
            jsonString = `${ jsonString }}`;
        }

        // Test to choose the correct '}'. Ignore '}' with '\' ahead
        if (jsonString.match(/}/g).length > 1) {
            jsonString = jsonString.match(/(.|\n)*?(?<!\\)}/);
        }

        if (jsonString.includes('}') && jsonString.indexOf('}') < jsonString.length) {
            jsonString = jsonString.substring(0, jsonString.indexOf('}') + 1);
        }

        jsonString = jsonString.trim();
        return jsonString;
    }

    appendLocalizedString(model, fieldPath, localizationPath) {
        /**
         * Append a localized string to the bodytext of the Labrador element-model
         * The localized string might be a disclaimer or similar
         * Localized string is defined in the Admin page 'Language options'
         * @param {Object} model - The Labrador element-model
         * @param {string} fieldPath - The path to the field to append the localized string to
         * @param {string} localizationPath - The path to the localized string to append
         */
        const fieldContent = model.get(fieldPath);
        if (!fieldContent || fieldContent.length === 0) {
            return;
        }

        this.siteAlias = this.rootModel.get('filtered.siteAlias') || this.siteInfo.alias;
        this.configSite = this.api.v1.config.get('labradorAi.globalSettings') || {};
        const hideDisclaimer = this.configSite.hideDisclaimer || false;
        if (hideDisclaimer) {
            return;
        }

        const localizedString = lab_api.v1.locale.get(localizationPath);
        if (!localizedString || localizedString.length === 0) {
            return;
        }
        model.set(fieldPath, `${ fieldContent }<hr><p class="italic ai-disclaimer" data-lab-italic="italic">${ localizedString }</p>`);
    }

    getPageLanguage(site, returnValue = 'name', returnSeoLanguage = false) {
        /**
         * Get the name of the language from the language code
         * @param {string} languageCode - The language code to get the name for
         */

        // Return seo language (prioritized)
        if (returnSeoLanguage) {
            const seolanguage = this.rootModel?.get('fields.seolanguage');
            if (seolanguage) {
                for (const contentLanguage of contentLanguages) {
                    if (seolanguage === contentLanguage.code) {
                        if (returnValue === 'code') {
                            return contentLanguage.code;
                        }
                        if (returnValue === 'name') {
                            return contentLanguage.name;
                        }
                    }
                }
            }
        }

        const langCode = lab_api.v1.config.get('contentLanguage', { site });
        if (!langCode) {
            return '';
        }

        // Return site langauge
        for (const contentLanguage of contentLanguages) {
            if (contentLanguage.code === langCode) {
                if (returnValue === 'code') {
                    return contentLanguage.code;
                }
                if (returnValue === 'name') {
                    return contentLanguage.name;
                }
            }
        }

        return '';
    }

    getLanguageNameByCode(langCode) {
        if (!langCode) {
            return '';
        }
        for (const contentLanguage of contentLanguages) {
            if (contentLanguage.code === langCode) {
                return contentLanguage.name;
            }
        }

        return '';
    }

    getContentLanguages() {
        /**
         * Get the content languages for the current site
         */
        return contentLanguages;
    }

    modifyClassNamesInView(view, classModifications) {
        /**
         * Modify the class names in the view content element
         * If warning or error is added, then it will removed after 3 seconds
         * @param {Object} view - The view (element) to modify class names in
         * @param {Object} classModifications - The class modifications to apply, like add or remove class names
         */
        const viewContentElement = view.getMarkup().querySelector('.content');
        if (viewContentElement) {
            if (classModifications.add) {
                viewContentElement.classList.add(...classModifications.add);
                if (viewContentElement.classList.contains('lab-highlight-warn')) {
                    setTimeout(() => {
                        this.modifyClassNamesInView(view, { remove: ['lab-highlight-warn'] });
                    }, 3000);
                }
                if (viewContentElement.classList.contains('lab-highlight-error')) {
                    setTimeout(() => {
                        this.modifyClassNamesInView(view, { remove: ['lab-highlight-error'] });
                    }, 3000);
                }
            }
            if (classModifications.remove) {
                viewContentElement.classList.remove(...classModifications.remove);
            }
        }
    }

    updateFeatureParamsFromSettings(featureSettingElements, params, promptConfig) {
        /**
         * Update the feature parameters from the settings modal
         * The feature parameters are stored on the Labrador element-model
         * When a user is changing the data set in the settings modal, the data is stored on the Labrador element-model
         * @param {Object} featureSettingElements - The elements in the settings modal to update the feature parameters from
         * @param {Object} params - The parameters to get the prompt configuration for, like featureName, siteAlias, etc.
         * @param {Object} promptConfig - The prompt configuration to update the feature parameters from
         */
        for (const element of featureSettingElements) {
            const key = element.getAttribute('id');
            let value;
            if (element.value) {
                value = element.value;
            }

            if (element.tagName === 'INPUT' && element.type === 'checkbox') {
                value = element.checked;
                this.labradorModel.set(`fields.labradorAi_${ params.featureName }_${ key }`, String(element.checked));
            } else if (!value && (element.type === 'textarea' || element.type === 'text')) {
                this.labradorModel.set(`fields.labradorAi_${ params.featureName }_${ key }`, '');
            } else if (value && String(promptConfig[key]) !== String(value)) {
                this.labradorModel.set(`fields.labradorAi_${ params.featureName }_${ key }`, value);
            }
        }
    }

}
