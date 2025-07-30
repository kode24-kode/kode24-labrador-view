import templates from './templates.js';
import { AbTest, TEST_METHODS } from './AbTest.js';
import contentLanguages from '../../lib/helpers/ContentLanguages.js';

/**
 * @typedef {Object} Collection
 * @property {number} [test_id] The test id of the collection, if present
 * @property {number} referenceId
 * @property {string} type
 * @property {Array<Variant>} variants
 * @property {string} id
 * @property {string} status
 * @property {number} modified
 * @property {number} created
 * @property {number} published
 * @property {number} variantCounter
 */

/**
 * @typedef {Object} Variant
 * @property {number} referenceId
 * @property {Object<string, any>} data
 * @property {{state?: boolean}} state
 * @property {number} modified
 * @property {number} created
 * @property {string} guid
 * @property {string} name
 * @property {string} notes
 * @property {number} partial
 */

export class TestManagerBase {

    constructor(api, model) {
        this.api = api;
        this.model = model;

        /**
         * @type {?Collection}
         */
        this.collection = null;

        this.default_test_method = TEST_METHODS.CLICK_RATIO_95_QUICK_EXIT;

        /**
         * @type {AbTest}
         */
        this.test = null;

        /**
         * @type {?Variant}
         */
        this.currentVariant = null;

        /**
         * Key is instance of Variant, value is navigation DOM-element etc.
         * @type {Map<any, any>}
         */
        this.preparedVariants = new Map();

        this.instanceOfId = this.model.get('instance_of') || this.model.get('id');
        this.timeoutId = null;
        this.ui = {
            sizes: {
                logo: 3,
                variantsContainer: 9,
                variants: 7,
                selectedVariant: 5
            },
            displayArticleData: false,
            displayTestData: false
        };
        this.usePartialData = false;
        this.listeners = new Map();
        this.deleter = this.deleteBinding.bind(this);
        this.modelDeleter = this.deleteModelBinding.bind(this);
        this.statistics = [];
        this.stats = {};
        this.estimateId = null;
    }

    setup(data = {}) {
        if (!this.validateOriginal()) {
            return false;
        }
        if (data.displayTestData !== undefined) {
            this.ui.displayTestData = data.displayTestData;
        }
        this.setupUI();
        return true;
    }

    getType(model) {
        return (model || this.model).getType().replace('page_', '');
    }

    getTitle(model) {
        return this.api.v1.util.string.stripTags((model || this.model).get('fields.title'));
    }

    setupUI() {
        if (!this.instanceOfId) {
            Sys.logger.warn('[TestManagerBase] Model is missing instance_of-id. No AB-versions here.');
            return;
        }
        this.hideExisting();
        this.api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/abtest/abtest.css');
        const site_id = this.model.get('fields.site_id') || null;
        const domain = (site_id) ? this.api.v1.site.getSiteById(site_id).domain : null;
        this.ui.container = this.api.v1.util.dom.renderTemplate(templates.ui, {
            type: this.getType(),
            id: this.model.get('id'),
            instanceOfId: this.instanceOfId,
            links: {
                edit: this.model.get('id') !== this.instanceOfId
            },
            front: domain || this.api.v1.properties.get('customer_front_url'),
            title: this.api.v1.util.string.stripTags(this.model.get('fields.title')),
            sizes: this.ui.sizes,
            displayArticleData: this.ui.displayArticleData,
            displayTestData: this.ui.displayTestData
        }, true);
        this.api.v1.model.bindings.bind(this.model, 'fields.title', (m, path, value) => {
            this.ui.container.querySelector('h3 span').innerHTML = this.api.v1.util.string.stripTags(value);
        });
        this.bindWidth();
        this.model.set('state.draggableDisabled', true, { notify: false, registerModified: false });

        this.ui.notesField = this.ui.container.querySelector('.variant-notes-field');
        this.ui.notesField.addEventListener('change', (event) => {
            this.currentVariant.setNotes(this.ui.notesField.value.trim());
            this.ui.notesField.blur();
            this.save();
        });

        if (this.ui.displayTestData) {
            this.ui.endTestNowButton = this.ui.container.querySelector('.end-test-now-btn');
            this.ui.endTestNowButton.addEventListener('click', (event) => {
                if (this.test && this.test.isRunning()) {
                    this.deleteTest();
                }
            });
            this.ui.startTestNowButton = this.ui.container.querySelector('.start-test-now-btn');
            this.ui.startTestNowButton.addEventListener('click', (event) => {
                this.setDefaultTestValues();
                this.api.v1.ui.modal.dialog({
                    container: {
                        css: 'ab-results',
                        state: {
                            ok: true
                        }
                    },
                    content: {
                        title: 'Do you want to publish current A/B test?',
                        description: '<p>The A/B test will be started with available variants and the page will publish now.</p>'
                    },
                    footer: {
                        buttons: [
                            {
                                type: 'button',
                                highlight: false,
                                id: 'ab_cancelBtn',
                                value: 'No, don\'t publish yet'
                            },
                            {
                                type: 'button',
                                highlight: true,
                                id: 'ab_okBtn',
                                value: 'Yes, publish now'
                            }
                        ]
                    },
                    eventHandlers: [
                        {
                            selector: '#ab_cancelBtn',
                            callback: (modal, event) => {
                                modal.close();
                            }
                        },
                        {
                            selector: '#ab_okBtn',
                            callback: (modal, event) => {
                                modal.close();
                                this.publish();
                            }
                        }
                    ]
                });
            });

            this.ui.testNowButton = this.ui.container.querySelector('.set-test-now-btn');
            this.ui.testNowButton.addEventListener('click', (event) => {
                this.setDefaultTestDuration();
            });

            this.ui.resetTestButton = this.ui.container.querySelector('.abtest-reset-btn');
            this.ui.resetTestButton.addEventListener('click', (event) => {
                this.resetAbTest();
            });

            this.ui.testMethodSelector = this.addTestMethodSelector();
            this.ui.testMethodSelector.addEventListener('change', (event) => {
                this.test.testMethod = event.target.value;
                this.ui.publish.button.classList.add('abtest-modified');
                this.updateTestUI();
            });

            this.ui.testStartField = this.ui.container.querySelector('.test-start-field');
            if (this.ui.testStartField) {
                this.ui.testStartField.addEventListener('change', (event) => {
                    const start_value = this.ui.testStartField.value.trim();
                    this.test.start = (start_value !== '') ? new Date(start_value) : '';
                    this.ui.publish.button.classList.add('abtest-modified');
                });
            }
            this.ui.testEndField = this.ui.container.querySelector('.test-end-field');
            if (this.ui.testEndField) {
                this.ui.testEndField.addEventListener('change', (event) => {
                    const end_value = this.ui.testEndField.value.trim();
                    this.test.end = (end_value !== '') ? new Date(end_value) : '';
                    this.ui.publish.button.classList.add('abtest-modified');
                });
            }

            this.ui.minVariantDifferenceField = this.ui.container.querySelector('.min-variant-lift');
            if (this.ui.minVariantDifferenceField) {
                this.ui.minVariantDifferenceField.addEventListener('change', (event) => {
                    this.test.methodoptions.minVariantDifference = parseInt(this.ui.minVariantDifferenceField.value, 10);
                    this.ui.publish.button.classList.add('abtest-modified');
                    this.getEstimate();
                });
            }

            this.ui.getEstimateValue = this.ui.container.querySelector('.estimate-value');

            this.ui.testIsPublishedField = this.ui.container.querySelector('.test-is-published');
            if (this.ui.testStartField) {
                this.ui.testIsPublishedField.addEventListener('change', (event) => {
                    if (this.ui.testIsPublishedField.checked) {
                        this.test.published = true;
                    } else {
                        this.test.published = false;
                    }
                    this.ui.publish.button.classList.add('abtest-modified');
                    if (this.ui.displayTestData) {
                        this.updateTestUI();
                    }
                });
            }
        }

        this.ui.variants = this.ui.container.querySelector('.variants');
        this.ui.originalBtn = this.ui.variants.querySelector('.original');
        this.ui.originalBtn.addEventListener('click', (event) => {
            this.resetView();
        });
        this.ui.container.querySelector('.add-variant-btn').addEventListener('click', (event) => {
            this.copyVariant();
        });
        this.ui.copyToOriginalBtn = this.ui.container.querySelector('.copy-to-orignal-btn');
        if (this.ui.copyToOriginalBtn) {
            this.ui.copyToOriginalBtn.addEventListener('click', (event) => {
                this.copyVariantToOriginal();
            });
        }
        this.ui.deleteBtn = this.ui.container.querySelector('.delete-variant-btn');
        this.ui.deleteBtn.addEventListener('click', (event) => {
            if (this.collection && this.currentVariant) {
                if (this.test && this.test.isRunning()) {
                    this.warnActiveTest({
                        title: 'Cannot delete variant',
                        description: 'You cannot delete a variant while the A/B test is running. Please stop the A/B test before copying.'
                    });
                    return;
                }
                const index = this.collection.getVariantIndex(this.currentVariant);
                this.preparedVariants.get(this.currentVariant).navigation.remove();
                this.api.v1.model.delete(this.preparedVariants.get(this.currentVariant).model, false, true);
                this.deleteVariant(this.currentVariant);
                this.currentVariant = null;
                const i = this.collection.getVariants().length > index ? index : index - 1;
                if (i > -1) {
                    this.displayVariant(i);
                } else {
                    this.resetView();
                }
                this.updateUI();
                this.save();
            }
        });
        this.ui.disableBtn = this.ui.container.querySelector('#disable-variant-btn');
        this.ui.disableBtn.addEventListener('change', (event) => {
            if (this.currentVariant) {
                if (this.ui.disableBtn.checked) {
                    this.currentVariant.disable();
                    this.preparedVariants.get(this.currentVariant).navigation.classList.add('abtest-disabled');
                } else {
                    this.currentVariant.enable();
                    this.preparedVariants.get(this.currentVariant).navigation.classList.remove('abtest-disabled');
                }
                this.save();
            }
        });
        this.ui.suggestBtn = this.ui.container.querySelector('.suggest-variant-btn');
        this.ui.suggestBtn.addEventListener('click', (event) => {
            const countEl = this.ui.container.querySelector('.suggest-variant-count-btn');
            let count = 3;
            if (countEl && countEl.value) {
                count = countEl.value;
            }
            this.suggestVariants(count);
        });
        this.ui.container.querySelector('.abtest-close-btn').addEventListener('click', (event) => {
            this.end();
        });
        this.ui.editablesContainer = this.ui.container.querySelector('.abtest-editables');
        this.ui.editablesContainerImage = this.ui.editablesContainer ? this.ui.editablesContainer.querySelector('.abtest-image') : null;
        this.ui.editablesContainerText = this.ui.editablesContainer ? this.ui.editablesContainer.querySelector('.abtest-text') : null;
        this.ui.publish = {
            button: this.ui.container.querySelector('.abtest-publish-btn')
        };
        this.ui.publish.button.addEventListener('click', (event) => {
            this.publish();
        });
        this.ui.deleteBtn = this.ui.container.querySelector('.abtest-delete-btn');
        this.ui.deleteBtn.addEventListener('click', (event) => {
            this.deleteCollection();
        });

        // Navigation
        this.ui.variantsContainer = this.ui.container.querySelector('.variants-container');
        this.ui.testsContainer = this.ui.container.querySelector('.tests-container');
        this.ui.testResultsContainer = this.ui.container.querySelector('.test-results-container');
        this.ui.navVariantsContainer = this.ui.container.querySelector('.tab-variants-container');
        this.ui.navTestsContainer = this.ui.container.querySelector('.tab-tests-container');
        this.ui.navTestResultsContainer = this.ui.container.querySelector('.tab-test-results-container');
        this.ui.navVariantsContainer.addEventListener('click', (event) => {
            this.ui.variantsContainer.classList.remove('lab-hidden');
            this.ui.testsContainer.classList.add('lab-hidden');
            this.ui.testResultsContainer.classList.add('lab-hidden');
            this.ui.navVariantsContainer.classList.add('lab-selected');
            if (this.ui.navTestsContainer) {
                this.ui.navTestsContainer.classList.remove('lab-selected');
            }
            if (this.ui.navTestResultsContainer) {
                this.ui.navTestResultsContainer.classList.remove('lab-selected');
            }
        });
        if (this.ui.navTestsContainer) {
            this.ui.navTestsContainer.addEventListener('click', (event) => {
                this.ui.testsContainer.classList.remove('lab-hidden');
                this.ui.testResultsContainer.classList.add('lab-hidden');
                this.ui.variantsContainer.classList.add('lab-hidden');
                this.ui.navTestsContainer.classList.add('lab-selected');
                this.ui.navVariantsContainer.classList.remove('lab-selected');
                this.ui.navTestResultsContainer.classList.remove('lab-selected');
            });
        }
        if (this.ui.navTestResultsContainer) {
            this.ui.navTestResultsContainer.addEventListener('click', (event) => {
                this.ui.testResultsContainer.classList.remove('lab-hidden');
                this.ui.variantsContainer.classList.add('lab-hidden');
                this.ui.testsContainer.classList.add('lab-hidden');
                this.ui.navTestResultsContainer.classList.add('lab-selected');
                this.ui.navVariantsContainer.classList.remove('lab-selected');
                this.ui.navTestsContainer.classList.remove('lab-selected');
            });
        }

        // Test-management
        // const testBtn = this.ui.container.querySelector('.tests-container .abtest-testing-btn');
        // testBtn.addEventListener('click', (event) => {
        //     console.log('klikk ...');
        // });
    }

    bindWidth() {
        this.api.v1.model.bindings.bind(this.model, 'width', () => {
            const w = this.model.getRaw('width');
            for (const [variant, value] of this.preparedVariants) {
                value.model.setRaw('width', w, { save: false });
            }
        });
    }

    setWidth(model) {
        model.setRaw('width', this.model.getRaw('width'), { save: false });
    }

    async getModelImageData() {
        try {
            const crop = await this.api.v1.article.frontcrop.get();
            if (crop) {
                const { pano } = crop;
                pano.contentdata.id = undefined;
                pano.contentdata.type = pano.type;
                if (pano.contentdata?.fields?.id) {
                    pano.contentdata.fields.id = undefined;
                }
                return pano;
            }
            const original_image = this.api.v1.model.query.getModelByPath('articleHeader/image');
            if (!original_image) {
                return null;
            }
            const image = this.api.v1.model.copy(original_image);
            this.api.v1.model.setNonPersistentState(image, true);
            return image.data;
        } catch (e) {
            return null;
        }
    }

    getModelData(model, isCopy = false) {
        if (model) {
            const data = this.api.v1.model.serialize.modelToInternal(model, true, isCopy);
            return data;
        }
        return {
            type: this.getType(),
            children: [],
            contentdata: {
                fields: {
                    title: {
                        value: this.model.get('fields.title')
                    },
                    subtitle: {
                        value: this.model.get('fields.subtitle')
                    }
                }
            }
        };
    }

    getOriginalModel() {
        return null;
    }

    validateJsonString(data) {
        let jsonString = data.trim();

        if (jsonString.includes('{') && jsonString.indexOf('{') > 0) {
            jsonString = jsonString.substring(jsonString.indexOf('{'));
        }

        if (!jsonString.includes('{')) {
            jsonString = `{${  jsonString }`;
        }

        if (!jsonString.includes('}')) {
            jsonString = `${  jsonString }}`;
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

    setupLanguage() {
        let { language } = this;

        // Get site language
        this.languageCode = this.api.v1.config.get('contentLanguage');
        if (this.languageCode) {
            for (const contentLanguage of contentLanguages) {
                if (contentLanguage.code === this.languageCode) {
                    language = contentLanguage.name;
                }
            }
        }

        // Get seo language
        const seolanguageCode = this.model.get('fields.seolanguage');
        if (seolanguageCode) {
            for (const contentLanguage of contentLanguages) {
                if (contentLanguage.code === seolanguageCode) {
                    language = contentLanguage.name;
                }
            }
        }
        return language;
    }

    async suggestVariants(count = 3, allowRetry = true) {
        this.ui.suggestBtn.parentElement.classList.add('lab-busy');
        this.ui.suggestBtn.disabled = true;

        // Get data from original article and use this to suggest title and summary.
        const articleData = await this.api.v1.util.httpClient.get(`/api/v1/article/${ this.instanceOfId }`);
        if (!articleData.result || !articleData.result[0]) {
            Sys.logger.warn(`[TestManagerBase] Cannot find data for original article "${ this.instanceOfId }"`);
            this.ui.suggestBtn.parentElement.classList.remove('lab-busy');
            this.ui.suggestBtn.disabled = false;
            return;
        }
        const aiConfig = this.api.v1.config.get('plugins.abtest.completion') || {};
        const prompt = `${ this.api.v1.util.dom.renderTemplate(aiConfig.prompt, {
            language: this.setupLanguage(),
            title: articleData.result[0].title || '',
            subtitle: articleData.result[0].subtitle || '',
            bodytext: articleData.result[0].bodytext || ''
        }) }`;
        let data = await this.api.v1.generate.text({
            service: aiConfig.service || 'chatCompletions',
            model: aiConfig.model || 'gpt-4o', // GPT-4o
            prompt,
            results: count
        }).catch((error) => {
            Sys.logger.warn(`[TestManagerBase] Error fetching suggestions:`);
            console.warn(error);
            if (allowRetry) {
                Sys.logger.debug(`[TestManagerBase] Will try again.`);
                this.suggestVariants(count, false);
            }
        });

        if (typeof data === 'string') {
            data = [data];
        }

        const original_model = this.getModelData(this.getOriginalModel(), true);
        if (original_model.children.length === 0) {
            const image = await this.getModelImageData();
            if (image) {
                original_model.children.push(image);
            }
        }

        for (let item of (data || [])) {
            try {
                item = this.validateJsonString(item);
                const texts = JSON.parse(item);
                const variant = this.collection.add(original_model, this.usePartialData);
                this.prepareVariant(variant);
                this.displayVariant(this.collection.getVariants().length - 1);
                const obj = this.preparedVariants.get(variant);
                if (texts.title) {
                    obj.model.set('fields.title', texts.title);
                }
                if (texts.summary) {
                    obj.model.set('fields.subtitle', texts.summary);
                }
                obj.editables = this.setupEditables(obj.model);
            } catch (error) {
                Sys.logger.warn(`[TestManagerBase] Cannot parse JSON-string: "${ item }"`);
            }
        }
        if (data) {
            this.ui.suggestBtn.parentElement.classList.remove('lab-busy');
            this.ui.suggestBtn.disabled = false;
        }
    }

    updateColelctionDrawer() {
        const rect = this.ui.container.getBoundingClientRect();
        document.querySelector('.lab-collection-drawer').style.setProperty('bottom', `${ rect.height }px`);
    }

    hideExisting() {
        const current = document.querySelector(`.abtest-ui-container:not([data-ab-container="${ this.model.getId() }"])`);
        if (current) {
            current.classList.add('abtest-will-hide');
            setTimeout(() => {
                current.classList.add('abtest-hidden');
                this.updateColelctionDrawer();
                current.remove();
            }, 500);
        }
    }

    validateOriginal() {
        if (!this.model.get('fields.published_url')) {
            Sys.logger.debug(`[TestManagerBase] Model do not validate for AB testing. Missing url`);
            this.api.v1.ui.modal.dialog({
                container: {
                    state: {
                        warning: true
                    }
                },
                content: {
                    title: 'Cannot run AB test',
                    description: 'This element has no URL defined and cannot run an A/B test. Please define a URL in the element settings.'
                },
                footer: {
                    buttons: [
                        {
                            type: 'button',
                            highlight: true,
                            id: 'ab_cancelBtn',
                            value: 'OK'
                        }
                    ]
                },
                eventHandlers: [{
                    selector: '#ab_cancelBtn',
                    callback: (modal, event) => {
                        modal.close();
                    }
                }]
            });
            return false;
        }
        return true;
    }

    displayCurrent() {
        this.ui.container.classList.remove('abtest-hidden');
        document.body.append(this.ui.container);
        setTimeout(() => {
            this.ui.container.classList.remove('abtest-will-hide');
            this.updateColelctionDrawer();
        }, 300);
    }

    hideCurrent() {
        if (this.ui.container.classList.contains('abtest-hidden')) {
            return;
        }
        this.ui.container.classList.add('abtest-will-hide');
        setTimeout(() => {
            this.ui.container.classList.add('abtest-hidden');
            this.updateColelctionDrawer();
            this.ui.container.remove();
        }, 300);
        this.api.v1.model.bindings.unbind(this.model, 'state.deleted', this.modelDeleter);
    }

    prepareVariants() {
        if (!this.collection) {
            return;
        }
        for (const variant of this.collection.getVariants()) {
            this.prepareVariant(variant);
        }
    }

    async ensureCollection() {
        this.toggleBusyState(true);
        if (!this.collection) {
            this.collection = await this.getCollection(this.instanceOfId).catch((error) => {});
            if (!this.collection) {
                Sys.logger.debug(`[TestManagerBase] Will create new collection collection. Reference-id: ${ this.instanceOfId }`);
                this.collection = await this.api.v1.abtest.collection.new({ referenceId: this.instanceOfId, type: this.getType(), pageId: this.api.v1.model.query.getRootModel().get('id') });
            } else {
                Sys.logger.debug(`[TestManagerBase] Found collection. ID: ${ this.collection.getId() }`);
                this.prepareVariants();
                // Make sure the collection holds current page ID (added December 2024)
                if (!this.collection.pageId) {
                    this.collection.pageId = this.api.v1.model.query.getRootModel().get('id');
                    this.save();
                }
            }
        }
        if (!this.test && this.ui.displayTestData) {
            this.test = new AbTest({ placeId: this.instanceOfId, url: this.getFrontUrl(), testMethod: this.default_test_method });
            this.testInstanceCreated();
            if (this.collection.test_id) {
                Sys.logger.debug(`[TestManagerBase] Found A/B test. ID: ${ this.collection.test_id }`);
                const test_data = await this.api.v1.abtest.test.get(this.collection.test_id);
                if (!test_data.success) {
                    this.showNoValidTestProviderDialog(test_data.message, 'Error: Cannot load A/B test from Kilkaya');
                }
                this.test.updateTestData(test_data.result);
                this.updateTestUI();
            }
        }
        return this.collection;
    }

    getFrontUrl() {
        const domain = this.api.v1.site.getSite().domain || this.api.v1.properties.get('customer_front_url');
        return domain + this.api.v1.model.query.getRootModel().get('fields.published_url').replace('/index', '/');
    }

    toggleBusyState(on, model = this.model) {
        for (const view of this.api.v1.view.getViews(model)) {
            if (on) {
                view.getMarkup().classList.add('lab-busy');
            } else {
                view.getMarkup().classList.remove('lab-busy');
            }
        }
    }

    // Default duration is 12 hours
    setDefaultTestDuration(ignoreIfExist = false) {
        if (ignoreIfExist && this.test.start && this.test.end) {
            return;
        }
        const date = new Date().getTime() + (new Date().getTimezoneOffset());
        this.test.start = new Date(date).toISOString();
        this.test.end = new Date(date + (60000 * 60 * 12)).toISOString();
        this.updateTestUI();
    }

    setDefaultTestValues() {
        this.test.testMethod = this.default_test_method;
        this.test.published = true;
        this.setDefaultTestDuration(true);
    }

    addTestMethodSelector() {
        const el = document.createElement('select');
        for (const testMethod of AbTest.getTestMethods()) {
            const selected = ((this.test && this.test.testMethod === testMethod.key) || testMethod.key === this.default_test_method) ? 'selected' : '';
            el.innerHTML += `<option value="${ testMethod.key }" ${ selected }>${ testMethod.description }</option>`;
        }
        this.ui.container.querySelector('.test-test-method').appendChild(el);
        el.addEventListener('change', (event) => {
            this.getEstimate();
        });
        return el;
    }

    resetAbTest() {
        this.api.v1.ui.modal.dialog({
            container: {
                state: {
                    warning: true
                }
            },
            content: {
                title: 'Reset A/B test results?',
                description: 'Resetting the A/B test results clears out any settings for the existing A/B test, but keeps your variations. This cannot be undone.'
            },
            footer: {
                buttons: [
                    {
                        type: 'button',
                        highlight: true,
                        id: 'ab_cancelBtn',
                        value: 'Cancel'
                    },
                    {
                        type: 'submit',
                        id: 'ab_resetBtn',
                        value: 'Reset'
                    }
                ]
            },
            eventHandlers: [{
                selector: '#ab_cancelBtn',
                callback: (modal, event) => {
                    modal.close();
                }
            }, {
                selector: '#ab_resetBtn',
                callback: async(modal, event) => {
                    const deleted = this.deleteTest();
                    if (deleted) {
                        this.doResetTest();
                        this.save();
                    }
                    modal.close();
                }
            }]
        });

    }

    doResetTest() {
        this.test = new AbTest({ placeId: this.instanceOfId, url: this.getFrontUrl() });
        this.testInstanceCreated();
        this.collection.test_id = null;
        this.collection.setHasActiveTest(false);
        this.resetView();
    }

    testInstanceCreated() {
        if (this.ui.displayTestData) {
            this.updateTestUI();
        }
    }

    async showNoValidTestProviderDialog(message, title) {
        const ab_settings = await this.api.v1.abtest.settings.get();
        this.api.v1.ui.modal.dialog({
            container: {
                state: {
                    warning: true
                }
            },
            content: {
                title: title || 'Could not save the A/B test',
                description: `${ message ? `Message: ${ message }<br><br>` : '' }Note: The A/B testing functionality must be enabled with your A/B test provider.<br>
If this issue persists, contact your A/B test provider (${ ab_settings.provider }) and verify that the functionality is enabled and correctly configured for your account (${ ab_settings.customer }). If so, please contact Labrador CMS at support@labradorcms.com.`
            },
            footer: {
                buttons: [
                    {
                        type: 'button',
                        highlight: true,
                        id: 'ab_cancelBtn',
                        value: 'Cancel'
                    },
                    {
                        type: 'submit',
                        id: 'ab_okBtn',
                        value: 'OK'
                    }
                ]
            },
            eventHandlers: [{
                selector: '#ab_cancelBtn',
                callback: (modal, event) => {
                    modal.close();
                }
            }, {
                selector: '#ab_okBtn',
                callback: async(modal, event) => {
                    modal.close();
                }
            }]
        });
    }

    saveOrUpdateTest(skipSave = false) {
        return new Promise((resolve, reject) => {
            if (!this.instanceOfId) { resolve(); return; }
            this.ensureCollection().then((collection) => {
                if (!this.test || !this.test.shouldSave()) {
                    resolve();
                    return;
                }

                // In cases where variants are created and later on the original is resized, we need to update width on all variants.
                const model = this.getOriginalModel();
                if (model) {
                    for (const variant of collection.getVariants()) {
                        variant.data.width = model.getRaw('width');
                    }
                }

                const promises = [];
                if (this.test.id) {
                    promises.push(this.api.v1.abtest.test.update(this.test.id, this.test.serialize(this.preparedVariants)));
                } else {
                    promises.push(
                        this.api.v1.abtest.test.create(
                            this.test.serialize(
                                this.preparedVariants,
                                this.model.get('fields.title'),
                                this.model.get('fields.published_url')
                            )
                        )
                    );
                }

                collection.setHasActiveTest(true);

                Promise.all(promises)
                    .then((results) => {
                        if (results[0].success === false) {
                            this.showNoValidTestProviderDialog(results[0] && results[0].message ? results[0].message : '');
                            reject(new Error(`[TestManager] Error saving A/B test: ${ results[0] && results[0].message ? results[0].message : '' } Collection ID: ${ this.collection.getId() }`));
                        } else {
                            this.test.updateTestData(results[0].result);
                            this.collection.test_id = this.test.id;
                            if (!skipSave) {
                                this.api.v1.abtest.collection.save(this.collection);
                            }
                            resolve();
                        }
                    }).then(resolve).catch((error) => {
                        console.error(`[TestManager] Error updating A/B test: `, error);
                        reject(error);
                    });
            });
        });
    }

    warnActiveTest({ title, description } = {}) {
        this.api.v1.ui.modal.dialog({
            container: {
                state: {
                    warning: true
                }
            },
            content: {
                title,
                description
            },
            footer: {
                buttons: [
                    {
                        type: 'button',
                        highlight: true,
                        id: 'ab_cancelBtn',
                        value: 'OK'
                    }
                ]
            },
            eventHandlers: [{
                selector: '#ab_cancelBtn',
                callback: (modal, event) => {
                    modal.close();
                }
            }]
        });
    }

    async copyVariant() {
        if (this.test && this.test.isRunning()) {
            this.warnActiveTest({
                title: 'Cannot copy variant',
                description: 'You cannot copy a variant while the A/B test is running. Please stop the A/B test before copying.'
            });
            return;
        }

        if (!this.currentVariant) {
            this.createVariant();
            return;
        }
        const obj = this.preparedVariants.get(this.currentVariant);
        this.collection.add(this.getModelData(obj.model, true), this.currentVariant.hasPartialData());
        this.save();
        this.displayVariant(this.collection.getVariants().length - 1);
    }

    copyVariantToOriginal() {
        if (!this.currentVariant) {
            return;
        }
        const obj = this.preparedVariants.get(this.currentVariant);
        const original = this.getOriginalModel();
        const modelData = this.getModelData(obj.model, true);
        let needCollectionUpdate = false;

        // Check if this is an "empty" original. If so, we need to remove the instance_of from the copied variant.
        if (!original.get('instance_of')) {
            this.api.v1.util.object.delete('contentdata.instance_of', modelData);
            needCollectionUpdate = true;
        }
        const newModel = this.api.v1.model.create.internal(modelData, null, true, false);
        if (needCollectionUpdate) {
            const listener = (model, path, value) => {
                this.api.v1.model.bindings.unbind(newModel, 'id', listener);
                obj.variant.referenceId = value;
                this.collection.referenceId = value;
                this.save();
                this.end();
                this.api.v1.app.save();
                setTimeout(() => {
                    this.api.v1.model.highlight.message(newModel, `Original is replaced by selected variant.`);
                }, 500);
            };
            this.api.v1.model.bindings.bind(newModel, 'id', listener);
            this.api.v1.model.replace(original, newModel);
            this.api.v1.model.highlight.message(obj.model, `Replacing original with selected variant ...`);
        } else {
            this.save();
            this.end();
            this.api.v1.model.replace(original, newModel);
            setTimeout(() => {
                this.api.v1.model.highlight.message(newModel, `Original is replaced by selected variant.`);
            }, 500);
        }
    }

    async createVariant() {
        if (!this.instanceOfId) { return; }
        const collection = await this.ensureCollection();
        const variant_data = this.getModelData(this.getOriginalModel(), true);
        if (variant_data.children.length === 0) {
            const image = await this.getModelImageData();
            if (image) {
                variant_data.children.push(image);
            }
        }
        collection.add(variant_data, this.usePartialData);
        this.save();
        this.displayVariant(collection.getVariants().length - 1);
    }

    deleteVariant(variant) {
        this.collection.deleteVariant(variant);
        this.preparedVariants.delete(variant);
        this.getEstimate();
    }

    async showDefaultFields() {
        return true;
    }

    async displayVariant(index) {
        if (!this.instanceOfId) {
            this.updatePublishStatus();
            return;
        }

        this.hideExisting();
        this.displayCurrent();

        this.api.v1.model.bindings.bind(this.model, 'state.deleted', this.modelDeleter);

        const collection = await this.ensureCollection();
        this.toggleBusyState(false);
        if (index !== false && collection.getVariants().length) {
            const variant = collection.getVariantByIndex(index);
            if (variant) {
                this.removeFromEditor(this.model);
                this.prepareVariant(variant);
            }
        } else {
            await this.showDefaultFields();
        }
        this.updatePublishStatus();
    }

    /**
     * @param referenceId
     * @return {Promise<Collection>}
     */
    getCollection(referenceId, reuse = false) {
        return new Promise((resolve, reject) => {
            if (reuse && this.collection && this.collection.referenceId === referenceId) {
                resolve(this.collection);
                return;
            }
            this.api.v1.abtest.collection.list(referenceId).then((data) => {
                if (data && data.result && data.result.length) {
                    this.api.v1.abtest.collection.load(data.result[0]).then((collection) => {
                        resolve(collection);
                    });
                } else {
                    reject(new Error(`No collection for reference id "${ referenceId }".`));
                }
            }).catch((error) => reject(error));
        });
    }

    removeFromEditor(model) {
        this.api.v1.model.removeFromEditor(model);
    }

    resetRemoveFromEditor(model) {
        this.api.v1.model.resetRemoveFromEditor(model);
    }

    getVariantData(variant, defaultData = {}) {
        const variantData = this.mergeData(JSON.parse(JSON.stringify(variant.getData())), defaultData);
        if (variant.hasPartialData() && this.getOriginalModel()) {
            if (variantData.metadata && variantData.metadata.width && !variantData.metadata.width.length) {
                delete variantData.metadata.width;
            }
            const modelData = this.getModelData(this.getOriginalModel());
            const data = this.api.v1.util.object.merge(modelData, variantData);
            variant.setHasPartialData(false);
            variant.setData(data);
            return this.api.v1.util.object.merge(data, defaultData);
        }
        return variantData;
    }

    mergeData(data, additions) {
        const result = this.api.v1.util.object.merge(data, additions);
        result.children = [];
        if (data.children) {
            for (const child of data.children) {
                result.children.push(this.mergeData(child, additions));
            }
        }
        return result;
    }

    preloadVariant(variant, addToController = true, setupEditables = true) {
        const model = this.api.v1.model.create.internal(this.getVariantData(variant, { state: { isNonPersistent: true, draggableDisabled: true } }), null, true, false);
        model.set('fields.referenceGuid', this.model.getGuid(), {
            save: false,
            notify: false,
            undoable: false
        });

        this.api.v1.model.setEditNonPersistentState(model, true);
        this.setWidth(model);
        if (addToController) {
            this.addToController(model);
        }
        this.preparedVariants.set(variant, {
            variant,
            model,
            navigation: null,
            editables: (setupEditables) ? this.setupEditables(model) : null
        });
        this.getEstimate();
        return model;
    }

    prepareVariant(variant) {
        if (this.currentVariant === variant) {
            return;
        }
        if (this.currentVariant) {
            const current = this.preparedVariants.get(this.currentVariant);
            if (current) {
                this.removeFromEditor(current.model);
            }
        }
        this.currentVariant = variant;
        if (this.preparedVariants.has(variant)) {
            const current = this.preparedVariants.get(this.currentVariant);
            if (current) {
                this.resetRemoveFromEditor(current.model);
            }
            this.updateUI(this.preparedVariants.get(variant));
            setTimeout(() => {
                this.api.v1.model.highlight.message(current.model, `A/B variant "${ variant.getName() }"`);
            }, 300);
            return;
        }

        const model = this.preloadVariant(variant);
        this.api.v1.model.bindings.bind(model, 'state.deleted', this.deleter);
        for (const m of this.api.v1.model.query.getModelsAsArray([model])) {
            this.registerListener(m, variant, model);
        }
        // In case user do not modify data: Make sure variant holds sufficient data
        variant.update(this.getModelData(model));

        this.updateUI(this.preparedVariants.get(variant));
    }

    setupEditables() {
        return {};
    }

    setupImagePlaceholder() {
        return {};
    }

    addToController(model) {
        this.api.v1.model.addSibling(this.model, model, false, false);
    }

    // Remove variant, display original
    resetView() {
        const current = this.currentVariant ? this.preparedVariants.get(this.currentVariant) : null;
        this.currentVariant = null;
        if (this.getOriginalModel()) {
            this.api.v1.model.resetRemoveFromEditor(this.model);
        }
        if (current) {
            this.api.v1.model.removeFromEditor(current.model);
            this.updateUI();
            setTimeout(() => {
                this.api.v1.model.highlight.message(this.model, `Original ${ this.model.getType() }`);
            }, 300);
        }
    }

    updateUI(variantObject) {
        if (variantObject && !variantObject.navigation) {
            const btn = document.createElement('span');
            btn.classList.add('lab-btn', 'lab-ellipsis');
            if (variantObject.variant.isDisabled()) {
                btn.classList.add('abtest-disabled');
            }
            btn.innerHTML = variantObject.variant.getName();
            btn.addEventListener('click', (event) => {
                this.removeFromEditor(this.model);
                this.prepareVariant(variantObject.variant);
                this.api.v1.model.highlight.default(variantObject.model, { scroll: true, approximateScroll: true });
                // this.updateUI(variantObject);
            });
            this.ui.variants.appendChild(btn);
            variantObject.navigation = btn;
        }

        for (const el of [...this.ui.variants.children]) {
            el.classList.remove('lab-selected');
            if (variantObject && el === variantObject.navigation) {
                el.classList.add('lab-selected');
            }
        }
        if (!variantObject) {
            this.ui.variants.querySelector('.original').classList.add('lab-selected');
        }

        if (this.test && this.ui.displayTestData) {
            this.updateTestUI();
        }

        if (this.ui.notesField) {
            this.ui.notesField.value = variantObject ? variantObject.variant.getNotes() : '';
            this.ui.notesField.disabled = !variantObject;
        }
        if (variantObject) {
            this.ui.disableBtn.checked = variantObject.variant.isDisabled();
            this.ui.disableBtn.disabled = false;
            this.ui.disableBtn.parentElement.classList.remove('lab-disabled');
            if (this.ui.copyToOriginalBtn) { this.ui.copyToOriginalBtn.disabled = false; }
        } else {
            this.ui.disableBtn.checked = false;
            this.ui.disableBtn.disabled = true;
            this.ui.disableBtn.parentElement.classList.add('lab-disabled');
            if (this.ui.copyToOriginalBtn) { this.ui.copyToOriginalBtn.disabled = true; }
        }

        if (this.ui.editablesContainer) {
            this.ui.editablesContainerImage.innerHTML = '';
            this.ui.editablesContainerText.innerHTML = '';
            if (variantObject) {
                this.ui.container.querySelector('.abtest-helpertext-title').classList.remove('lab-hidden');
                this.ui.editablesContainerImage.appendChild(variantObject.editables.image);
                this.ui.editablesContainerText.appendChild(variantObject.editables.kicker);
                this.ui.editablesContainerText.appendChild(variantObject.editables.title);
                this.ui.editablesContainerText.appendChild(variantObject.editables.subtitle);
            } else {
                this.ui.container.querySelector('.abtest-helpertext-title').classList.add('lab-hidden');
                const elements = this.setupEditables(this.model, true);
                this.setupImagePlaceholder();
                this.ui.editablesContainerText.appendChild(elements.kicker);
                this.ui.editablesContainerText.appendChild(elements.title);
                this.ui.editablesContainerText.appendChild(elements.subtitle);
            }
        }
    }

    removeTestBtn() {
        for (const viewport of this.api.v1.viewport.getActive()) {
            const view = this.api.v1.view.getView(this.model, viewport);
            const el = view.getExtraElement('abElement');
            if (el) {
                view.unsetExtraElement('abElement');
                el.remove();
            }
        }
    }

    updateTestUI() {
        if (this.test && this.test.id) {
            for (const viewport of this.api.v1.viewport.getActive()) {
                const view = this.api.v1.view.getView(this.model, viewport);
                if (!view.getExtraElement('abElement')) {
                    const el = view.setExtraElement('abElement', this.getCustomIcon(this.model, view, this));
                    view.getMarkup().appendChild(el);
                }
            }
        } else {
            this.removeTestBtn();
        }
        const status_field = this.ui.container.querySelector('.test-status');
        let status_text = this.test.status;
        const is_completed = this.test.isFinished();
        if (is_completed && this.test.results.statistics) {
            const num_views = this.test.results.statistics.reduce((cc, item) => cc + item.views, 0);
            const num_clicks = this.test.results.statistics.reduce((cc, item) => cc + item.clicks, 0);
            status_text += ` (${ num_views } views, ${ num_clicks } clicks)`;
            this.stats = this.prepareNumbers(this.test.results);
            this.statistics = this.prepareStatistics(this.stats);
        }
        status_field.innerHTML = status_text;
        this.ui.testMethodSelector.value = this.test.testMethod;
        if (is_completed) {
            this.ui.testMethodSelector.setAttribute('disabled', true);
        }
        this.ui.testStartField.value = this.test.correct_start.slice(0, 19);
        this.ui.testEndField.value = this.test.correct_end.slice(0, 19);
        this.ui.minVariantDifferenceField.value = this.test.methodoptions.minVariantDifference;
        this.ui.minVariantDifferenceField.setAttribute('data-value', this.test.methodoptions.minVariantDifference);
        this.ui.testIsPublishedField.checked = this.test.published;
        this.ui.minVariantDifferenceField.disabled = !!this.test.published;
        this.ui.resetTestButton.disabled = (this.collection.test_id === null && this.test && this.test.id);
        this.ui.startTestNowButton.disabled = (this.test && this.test.isFinished()) || this.preparedVariants.size === 0;
        this.ui.endTestNowButton.disabled = !this.test || (this.test && !this.test.isRunning());
        if (this.ui.navTestResultsContainer) {
            this.ui.navTestResultsContainer.disabled = !(this.test && this.test.results.statistics);
            if (!this.ui.navTestResultsContainer.disabled) {
                this.displayStatistics();
            }
        }
    }

    prepareNumbers(data) {
        const result = { ...data };
        const stats = [];
        if (!data.statistics) {
            return stats;
        }
        const max = {
            views: 0,
            clicks: 0
        };
        for (const item of data.statistics) {
            if (item.views > max.views) {
                max.views = item.views;
            }
            if (item.clicks > max.clicks) {
                max.clicks = item.clicks;
            }
        }
        result.max = max;
        for (const item of data.statistics) {
            const copy = { ...item };
            copy.scoreNice = Math.round(item.score);
            copy.viewsNice = this.api.v1.util.string.niceNumber(item.views);
            copy.clicksNice = this.api.v1.util.string.niceNumber(item.clicks);
            copy.viewsPercent = Math.round((item.views / max.views) * 100);
            copy.clicksPercent = Math.round((item.clicks / max.clicks) * 100);
            stats.push(copy);
        }
        result.statistics = stats;
        return result;
    }

    prepareStatistics(data) {
        const map = this.sortVariantsByTestId();
        const result = [];
        if (!data.statistics) {
            return result;
        }
        let maxScore = 0;
        let maxScoreIndex = null;
        for (const stats of data.statistics) {
            const variantObject = map[stats.variant_id];
            result.push({
                ...stats,
                ...variantObject
            });
            if (stats.score > maxScore) {
                maxScore = stats.score;
                maxScoreIndex = data.statistics.indexOf(stats);
            }
            if (variantObject && variantObject.obj && variantObject.obj.navigation) {
                variantObject.obj.navigation.setAttribute('data-test-views', stats.views);
                variantObject.obj.navigation.setAttribute('data-test-clicks', stats.clicks);
                variantObject.obj.navigation.setAttribute('data-test-score', Math.round(stats.score));
            }
        }
        if (maxScoreIndex !== null && result[maxScoreIndex].obj.navigation) {
            result[maxScoreIndex].obj.navigation.setAttribute('data-test-winner', '1');
        }
        result.sort((a, b) => a.score - b.score);
        return result.reverse();
    }

    displayStatistics() {
        const data = this.prepareStatistics(this.stats);
        let no_data_text = 'Test results and data will show up here as soon as the test is completed';
        if (this.stats.status === 'finish') {
            no_data_text = 'Test results are unavailable because no data (or not enough data) could be gathered';
        }
        const markup = this.api.v1.util.dom.renderTemplate(templates.result, {
            data,
            no_data_text,
            stats: this.stats,
            article: {
                id: this.model.get('instance_of') || this.model.get('id'),
                title: this.model.get('fields.title')
            }
        }, false);
        this.ui.testResultsContainer.querySelector('.results-container').innerHTML = markup;
    }

    sortVariantsByTestId() {
        const result = {};
        if (!this.test || !this.test.variants) {
            return result;
        }
        for (const variant of this.test.variants) {
            for (const item of variant.data) {
                if (item.name === 'identifier') {
                    result[variant.id] = {
                        identifier: item.value,
                        name: variant.name
                    };
                    const variantItem = this.getPreparedVariantByGuid(item.value);
                    if (variantItem) {
                        result[variant.id].obj = variantItem;
                    } else if (item.value === 'original') {
                        result[variant.id].obj = {
                            model: this.getOriginalModel(),
                            navigation: this.ui.originalBtn
                        };
                    }
                }
            }
        }
        return result;
    }

    getPreparedVariantByGuid(guid) {
        for (const [variant, item] of this.preparedVariants) {
            if (variant.getGuid() === guid) {
                return item;
            }
        }
        return null;
    }

    deleteBinding(m, path, value) {
        for (const [theVariant, obj] of this.preparedVariants) {
            if (obj.model === m) {
                const index = this.collection.getVariantIndex(theVariant);
                this.preparedVariants.get(theVariant).navigation.remove();
                this.deleteVariant(theVariant);
                if (this.currentVariant === theVariant) {
                    this.currentVariant = null;
                }
                const i = this.collection.getVariants().length > index ? index : index - 1;
                if (i > -1) {
                    this.displayVariant(i);
                } else {
                    this.resetView();
                }
                this.unregisterListener(m);
                this.save();
            }
        }
    }

    deleteModelBinding(m, path, value) {
        this.hideCurrent();
    }

    registerListener(model, variant, targetModel) {
        this.listeners.set(model, (m, path, value) => {
            if (['gridWidth', 'absoluteGridWidth', 'state.deleted'].includes(path)) {
                return;
            }
            // Data modified. Update variant
            variant.update(this.getModelData(targetModel));
            this.save();
        });
        this.api.v1.model.bindings.bindAll(model, this.listeners.get(model));
    }

    unregisterListener(model) {
        for (const m of this.api.v1.model.query.getModelsAsArray([model])) {
            if (this.listeners.has(m)) {
                this.api.v1.model.bindings.unbindAll(m, this.listeners.get(m));
                this.listeners.delete(m);
            }
        }
    }

    validateVariants(variantObjects) {
        for (const [variant, obj] of variantObjects) {
            if (!obj.model.get('fields.title')) {
                return false;
            }
        }
        return true;
    }

    save() {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(() => {
            // Update variants in collection in case they are modified before handled by this class.
            // Example: Data is set when replacing an image in the variant.
            for (const [variant, obj] of this.preparedVariants) {
                variant.update(this.getModelData(obj.model));
            }
            this.api.v1.abtest.collection.save(this.collection)
                .then(() => {
                    this.updatePublishStatus();
                    this.ui.container.classList.remove('lab-busy');
                    this.toggleBusyState(false);
                });
        }, 500);
    }

    publish() {
        if (this.collection) {
            if (!this.validateVariants(this.preparedVariants)) {
                console.warn('[TestManager] Validation failed for variants');
                this.api.v1.ui.modal.dialog({
                    container: {
                        state: {
                            error: true
                        }
                    },
                    content: {
                        title: 'Validation failed',
                        description: 'All variants must have a title. The test is not published. Please add a title to all variants and try again.'
                    },
                    noArchive: true,
                    footer: {
                        buttons: [
                            {
                                type: 'submit',
                                value: 'OK'
                            }
                        ]
                    }
                });
                return;
            }
            this.toggleBusyState(true);
            this.ui.container.classList.add('lab-busy');

            // Update pageId on the collection in case it is created on the original article.
            this.collection.pageId = this.api.v1.model.query.getRootModel().get('id');

            this.saveOrUpdateTest()
                .then(() => this.api.v1.abtest.collection.publish(this.collection))
                .then(() => {
                    this.updatePublishStatus();
                    this.api.v1.app.publish();
                    this.ui.container.classList.remove('lab-busy');
                    this.toggleBusyState(false);
                    let currentModel = this.model;
                    if (this.currentVariant) {
                        currentModel = this.preparedVariants.get(this.currentVariant).model;
                    }
                    if (currentModel) {
                        this.api.v1.model.highlight.message(currentModel, `AB test is published`);
                    }
                    this.updateTestUI();
                }).catch((error) => {
                    console.error(`[TestManager] Error publishing collection: `, error);
                    const err = new Error(error.toString(), { cause: error });
                    lab_api.v1.app.logViewError(err, 'entry');
                    this.ui.container.classList.remove('lab-busy');
                    this.toggleBusyState(false);
                });
        }
    }

    deleteCollection() {
        if (!this.collection || !this.collection.isPersistent()) {
            return;
        }

        this.api.v1.ui.modal.dialog({
            container: {
                state: {
                    warning: true
                }
            },
            content: {
                title: 'Delete test and variants of this article?',
                description: 'You cannot undo this.'
            },
            footer: {
                buttons: [
                    {
                        type: 'button',
                        highlight: true,
                        id: 'ab_cancelBtn',
                        value: 'Cancel'
                    },
                    {
                        type: 'submit',
                        id: 'ab_deleteBtn',
                        value: 'Delete'
                    }
                ]
            },
            eventHandlers: [{
                selector: '#ab_cancelBtn',
                callback: (modal, event) => {
                    modal.close();
                }
            }, {
                selector: '#ab_deleteBtn',
                callback: (modal, event) => {
                    this.end();
                    this.deleteTest();
                    this.removeTestBtn();
                    this.api.v1.abtest.collection.delete(this.collection).then(() => {
                        console.log('[TestManager] Collection persistently deleted');
                    }).catch((error) => {
                        console.error(`[TestManager] Error deleting collection: `, error);
                    });
                }
            }]
        });
    }

    deleteTest() {
        if (this.test && this.test.id) {
            // First, unpublish the test, then delete it.
            this.unpublishTest().then(() => {
                this.api.v1.abtest.test.delete(this.test.id).then((result) => {
                    this.doResetTest();
                    this.save();
                    console.log(`[TestManager] Test deleted`);
                }).catch((error) => {
                    console.error(`[TestManager] Error deleting test: `, error);
                });
                this.test = null;
            }).catch((error) => {
                console.error(`[TestManager] Error unpublishing test: `, error);
            });
        } else {
            console.warn('[TestManager] No test to delete ...');
        }
    }

    // (Promise) Unpublish current test.
    unpublishTest() {
        return new Promise((resolve, reject) => {
            if (this.test && this.test.id) {
                this.test.published = false;
                this.saveOrUpdateTest(true).then(() => {
                    if (this.ui.displayTestData) {
                        this.updateTestUI();
                    }
                    resolve();
                }).catch(reject);
                return;
            }
            reject(new Error('No test to unpublish'));
        });
    }

    getEstimate() {
        if (!this.ui.displayTestData) {
            return;
        }
        window.clearTimeout(this.estimateId);
        this.estimateId = window.setTimeout(() => {
            this.ui.getEstimateValue.classList.add('lab-content-busy');
            const testData = {
                start: this.ui.testStartField.value || new Date(),
                end: this.ui.testEndField.value || new Date(new Date().getTime() + (60 * 60 * 24 * 1000)),
                placeId: this.instanceOfId,
                url: this.getFrontUrl(),
                testMethod: this.ui.testMethodSelector.value
            };
            const test = new AbTest(testData);
            test.updateTestData({
                methodoptions: {
                    minVariantDifference: this.ui.minVariantDifferenceField.value
                }
            });
            this.api.v1.abtest.test.estimate(test.serialize(this.preparedVariants)).then((data) => {
                this.ui.getEstimateValue.innerHTML = data.result || 'Cannot estimate';
                if (this.ui.displayTestData) {
                    this.updateTestUI();
                }
                this.ui.getEstimateValue.classList.remove('lab-content-busy');
            }).catch((error) => {
                console.error(`[TestManager] Error estimating test: `, error);
                this.ui.getEstimateValue.classList.remove('lab-content-busy');
            });
        }, 400);
    }

    updatePublishStatus() {
        if (!this.collection) {
            this.ui.publish.button.setAttribute('disabled', 'disabled');
            return;
        }
        if (this.collection.isPersistent()) {
            this.ui.publish.button.removeAttribute('disabled');
            this.ui.deleteBtn.removeAttribute('disabled');
            if (this.ui.displayTestData) {
                if (this.collection.test_id) {
                    this.ui.resetTestButton.removeAttribute('disabled');
                } else {
                    this.ui.resetTestButton.setAttribute('disabled', 'disabled');
                }
            }
        } else {
            this.ui.publish.button.setAttribute('disabled', 'disabled');
            this.ui.deleteBtn.setAttribute('disabled', 'disabled');
            if (this.ui.displayTestData) {
                this.ui.resetTestButton.setAttribute('disabled', 'disabled');
            }
        }
        const isModified = this.collection.getModified() !== this.collection.getPublished();
        if (isModified) {
            this.ui.publish.button.classList.add('abtest-modified');
        } else {
            this.ui.publish.button.classList.remove('abtest-modified');
        }
    }

    end() {
        this.hideCurrent();
        this.resetView();
        for (const [, value] of this.preparedVariants) {
            this.api.v1.model.bindings.unbind(value.model, 'state.deleted', this.deleter);
            this.unregisterListener(value.model);
        }
        for (const [key, value] of this.preparedVariants) {
            this.api.v1.model.delete(value.model, true, true);
            this.preparedVariants.delete(key);
        }
        this.model.set('state.draggableDisabled', false, { notify: false, registerModified: false });
    }

}
