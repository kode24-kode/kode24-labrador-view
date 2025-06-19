import contentLanguages from '../../lib/helpers/ContentLanguages.js';

export class ArticleTranslate {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.enabled = true;
        this.newCopyId = 0;
        this.translationTargets = this.api.v1.config.get('articleTranslationTargets');
        this.multiLanguageConfig = this.api.v1.config.get(`multiLanguage.languages`) || [];
        this.selectedLanguage = this.getPageLanguage();
        this.prototypes = [];
        this.defaultTemplate = `
            <div class="lab-modal-form lab-grid lab-hidden">
                <div class="lab-formgroup lab-grid lab-grid-gap lab-space-above-none">

                    <h2 class="lab-grid-large-12">Article translate</h2>
                    <div id="translationInfo" class="lab-grid-large-12">
                        <div id="btnTranslationInfo" style="cursor: pointer;">Labrador AI helps you with translating the article. <a href="#">Click for more info</a></div>
                        <p class="lab-hidden info"><b>Translate article</b> will translate the current article, while <b>Duplicate and translate</b> lets you make another article version that duplicates the current article and translates it.</p>
                        <p class="lab-hidden info">Duplicated articles need to be assigned a site and a prototype before they can be created. <a href="/settings/cp?page=multiLanguage" target="_blank">You can skip this step by adding default settings for your preferred language(s) for translation</a>. The language(s) will be visible in "Overview" below.</p>
                        <p class="lab-hidden info">You can also fine tune the translation into your preferred style by adding <a href="/settings/cp?page=labradorAi" target="_blank">custom prompt for your site</a>.</p>
                    </div>

                    <select id="languages">
                        <option value="">Select language</option>
                        {{ #languages }}
                        <option value="{{ code }}"{{ #selected }} selected{{ /selected }}>{{ name }} ({{ code }})</option>
                        {{ /languages }}
                    </select>
                    <div id="infoTextMainArea" class="lab-hidden">Ongoing translation process of this article</div>
                    <progress id="progressBarMainArea" class="lab-hidden" value=0 min=0 max=0 style="width:100%; height:50px;"></progress>
                    <div id="btnAdvancedSettings" class="lab-btn lab-space-right-medium lab-hidden">Advanced settings</div>
                    <div id="btnTranslateThisArticle" class="lab-btn lab-generate lab-space-right-medium">Translate article</div>
                    <div id="btnPrepareNewCopy" class="lab-btn lab-align-right">Duplicate and translate</div>
                    <h2 class="lab-grid-large-12">Overview</h2>
                    <div id="copiesOverview" class="lab-grid lab-grid-gap" style="width: 100%;"></div>
                </div>
            </div>
        `;

        this.newCopyTemplate = `
            <div style="border: 1px solid black; width: 100%; margin: 5px; padding: 0 10px;">
                <div class="lab-formgroup lab-grid lab-space-above-none">
                    <div class="removeFromOverview" style="position: absolute; top: 10px; right: 10px; background-color:rgb(167, 17, 6); color: white; font-size: 16px; width: 20px; height: 20px; text-align: center; line-height: 20px; border-radius: 50%; cursor: pointer;">X</div>
                    <h3 style="width: 100%">Create a new version{{ #languageSelectionName }} for '{{ languageSelectionName }}'{{ /languageSelectionName }}</h3>
                    <p id="progress-info" class="lab-hidden"></p>
                    <progress id="progress-meter" class="lab-hidden" value=0 min=0 max=0 style="width:100%; height:50px;"></progress>
                    <label class="translationSelection" for="languages"><b>Translate to</b></label>
                    <select name="languages" class="languages translationSelection">
                        <option value="">Select language</option>
                        {{ #languages }}
                        <option value="{{ code }}"{{ #selected }} selected{{ /selected }}>{{ name }} ({{ code }})</option>
                        {{ /languages }}
                    </select>

                    <div class="lab-formgroup-item lab-grid-large-5 lab-space-right-medium translationSelection">
                        <label for="site_id"><b>Select site</b></label>
                        <select name="site_id" class="site_id">
                            {{#sites}}
                            <option value="{{value}}" {{#selected}}selected{{/selected}}>{{name}}</option>
                            {{/sites}}
                        </select>
                    </div>

                    <div class="lab-formgroup-item lab-grid-large-5 translationSelection">
                        <label for="prototype_id"><b>Select prototype</b></label>
                        <select name="prototype_id" class="prototype_id">
                            {{#prototypes}}
                            <option value="{{value}}" {{#selected}}selected{{/selected}}>{{name}}</option>
                            {{/prototypes}}
                        </select>
                    </div>
                    <div id="btnCreateLinkedCopy" class="lab-btn lab-space-right-medium lab-hidden translationSelection">Duplicate article</div>
                    <div id="btnCreateNewTranslation" class="lab-btn lab-generate lab-align-right translationSelection">Duplicate and translate</div>
                </div>
            </div>
        `;

        this.existingCopyTemplate = `
            <div style="border: 1px solid black; width: 100%; margin: 5px; padding: 0 10px;">
                <div class="lab-formgroup lab-grid lab-space-above-none">
                    <h3 style="width: 100%">{{articleId}}: <em>{{ title }}</em></h3>

                    <div class="lab-formgroup-item lab-grid-large-3">Language</div><div class="lab-formgroup-item lab-grid-large-8">{{language}}</div>
                    <div class="lab-formgroup-item lab-grid-large-3">Status</div><div class="lab-formgroup-item lab-grid-large-8 status">{{status}}</div>

                    <div id="btnMakeChanges" class="lab-btn lab-space-right-medium lab-hidden">Sync with original version</div>
                    <div id="btnGoToArticle" class="lab-btn">Go to article</div>
                </div>
            </div>
        `;

    }

    onMarkup() {
        /**
         * Markup for the translate article function, in article settings
         */
        this.languages = contentLanguages.map((language) => ({ name: language.name, code: language.code, selected: language.code === this.selectedLanguage }));
        this.setupPrototypes();
        this.markup = this.api.v1.util.dom.renderTemplate(this.defaultTemplate, {
            languages: this.languages,
            prototypes: this.prototypes
        }, true);

        const language = this.markup.querySelector('#languages');
        language.addEventListener('change', (event) => {
            this.selectedLanguage = language.value;
        });

        this.prepareNewCopyButton = this.markup.querySelector('#btnPrepareNewCopy');
        this.prepareNewCopyButton.addEventListener('click', () => {
            this.prepareNewCopy();
        });

        // Translation of THIS article, the one user is currently on
        this.btnTranslateThisArticle = this.markup.querySelector('#btnTranslateThisArticle');
        this.btnTranslateThisArticle.addEventListener('click', () => {
            this.btnTranslateThisArticle.classList.add('lab-disabled');
            this.markup.querySelector('#infoTextMainArea').classList.remove('lab-hidden');
            const progressBar = this.markup.querySelector('#progressBarMainArea');
            progressBar.classList.remove('lab-hidden');
            this.updateProgressBar(progressBar, { setAttributeValues: { value: 1, max: 10 } });

            const articleId = this.rootModel.get('id');
            const languageName = this.getLanguageName(this.selectedLanguage);

            // Get new copy data - getNodeAndData
            this.getNodeAndData(articleId).then((nodeData) => {
            // Translate content - translateContent
                const params = {
                    featureName: 'translateArticle',
                    language: languageName,
                    cleanUpJsonString: true,
                    updateModel: false
                };
                this.updateProgressBar(progressBar, { updateAttributes: ['value'] });
                this.translateNode(nodeData, params, true)
                    .then((response) => {
                        response.fields.hasTranslation = '1';
                        response.fields.seolanguage = this.selectedLanguage;
                        for (const child of response.children) {
                            this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                            this.overwriteNodeData(child.id, child.type, child);
                            if (child.children && child.children.length > 0) {
                                for (const grandChild of child.children) {
                                    this.overwriteNodeData(grandChild.id, grandChild.type, grandChild);
                                }
                            }
                        }
                        this.updateProgressBar(progressBar, { updateAttributes: ['value'] });
                        this.overwriteNodeData(articleId, 'article', response)
                            .then((r) => {
                                this.btnTranslateThisArticle.classList.remove('lab-disabled');
                                // this.btnTranslateThisArticle.classList.remove('lab-busy');
                                this.markup.querySelector('#infoTextMainArea').textContent = 'Translation completed. Refresh to see changes.';
                                this.updateProgressBar(progressBar, { finished: true });

                                // Force an editor reload to see changes:
                                window.location.href = `/edit/article/id/${ articleId }`;

                            });
                    });
            });
        });

        this.markup.querySelector('#btnTranslationInfo').addEventListener('click', () => {
            const translationInfo = this.markup.querySelectorAll('#translationInfo .info');
            for (const info of translationInfo) {
                info.classList.remove('lab-hidden');
            }
            this.markup.querySelector('#btnTranslationInfo').classList.add('lab-hidden');
        });

        // Open advanced ai settings modal for custom prompt
        this.markup.querySelector('#btnAdvancedSettings').addEventListener('click', () => {
            const params = {
                featureName: 'translateArticle',
                disableGenerateButton: true
            };
            this.api.v1.ns.get('textAssistant.openFeatureSettings')(this.rootModel, null, null, params);
        });

        for (const languageConfig of this.multiLanguageConfig) {
            if (languageConfig.autoSuggestTranslation && languageConfig.autoSuggestTranslation === true) {
                const options = {
                    language: languageConfig.language,
                    siteName: languageConfig.siteName || null,
                    prototypeName: languageConfig.prototypeName || null,
                    languageSelectionName: languageConfig.name || null
                };
                const newCopy = this.getNewCopyTemplate(options);
                const removeFromOverview = newCopy.querySelector('.removeFromOverview');
                removeFromOverview.addEventListener('click', () => {
                    this.markup.querySelector('#copiesOverview').removeChild(newCopy);
                });
                this.markup.querySelector('#copiesOverview').prepend(newCopy);

            }
        }

        this.fetchListOfCopies().then((existingCopies) => {
            // console.log(existingCopies);
            for (const articleCopy of existingCopies) {
                this.updateCopyInOverview(articleCopy);
            }
        });
        return this.markup;
    }

    getLanguageName(code) {
        /**
         * Get the language name from the language code
         * @param {string} code - The language code
         */
        const language = contentLanguages.find((lang) => lang.code === code);
        if (language) {
            return language.name;
        }
        return null;
    }

    updateCopyInOverview(articleCopy, replaceElement = false) {
        /**
         * Update the copy in the overview
         * @param {object} articleCopy - The data for the article copy, to be used for element in overview
         */
        const updateCopy = this.getExistingCopyTemplate(articleCopy);
        updateCopy.id = articleCopy.elementId || `copy-${ articleCopy.id }`;
        const articleId = articleCopy.id || articleCopy.articleId;

        updateCopy.querySelector('#btnMakeChanges').addEventListener('click', () => {
            const options = {
                elementId: updateCopy.id,
                headerTitle: `Update ${ articleId }: <em>${ articleCopy.title }</em>`,
                language: articleCopy.seolanguage,
                articleId
            };
            const updatedTemplate = this.getNewCopyTemplate(options);
            this.markup.querySelector('#copiesOverview').replaceChild(updatedTemplate, updateCopy);
        });

        updateCopy.querySelector('#btnGoToArticle').addEventListener('click', () => {
            window.open(`/edit/article/id/${ articleId }`, '_blank');
        });

        // If an older element with the same ID exists, replace it:
        if (articleId) {
            const oldTemplate = this.markup.querySelector(`#${ updateCopy.id }`);
            if (oldTemplate) {
                this.markup.querySelector('#copiesOverview').replaceChild(updateCopy, oldTemplate);
            } else {
                this.markup.querySelector('#copiesOverview').appendChild(updateCopy);
            }
        } else {
            this.markup.querySelector('#copiesOverview').appendChild(updateCopy);
        }

    }

    setBusyState(rootElement, busy = true) {
        /**
         * Set the busy state and disabling of buttons for an element
         * @param {HTMLElement} rootElement - The root element to be marked as busy
         * @param {boolean} busy - The current state of the element
         */
        const rootElementId = rootElement.id;
        const allElements = [rootElement.id, ...rootElement.querySelectorAll('[id]')];
        const ids = allElements.filter((element) => element.id).map((element) => element.id);
        for (const id of ids) {
            if (busy === true) {
                this.markup.querySelector(`#${ rootElementId } #${ id }`).classList.add('lab-busy');
                this.markup.querySelector(`#${ rootElementId } #${ id }`).classList.add('lab-disabled');

            } else {
                this.markup.querySelector(`#${ rootElementId } #${ id }`).classList.remove('lab-busy');
                this.markup.querySelector(`#${ rootElementId } #${ id }`).classList.remove('lab-disabled');

            }
        }
    }

    splitText(fullText, splitTarget = '</p>') {
        /**
         * Split the data into smaller parts
         * @param {string} dataString - The data to be splitted
         * @param {string} targetField - The field name to be splitted
         * @param {string} splitTarget - The target to split the data with
         */

        const splittedText = fullText.split(splitTarget);
        const maxLength = 1200;
        let part = '';
        let index = 0;
        const textPartials = {};

        // Split up bodytext into bodytext-partials
        if (splittedText) {
            for (let partial of splittedText) {
                if (partial && partial.length > 0) {
                    partial += splitTarget;
                    part += partial;

                    if (part.length > maxLength) {
                        index += 1;
                        textPartials[index] = part;
                        part = '';
                    }
                }
            }
        }

        // Include remainder
        if (part && part.length > 0) {
            textPartials[index + 1] = part;
        }

        return textPartials;

    }

    getPageLanguage() {
        /**
         * Get the language code of the current page, either seo language og site specified language
         */
        const seolanguageCode = this.rootModel.get('fields.seolanguage');
        if (seolanguageCode) {
            return seolanguageCode;
        }
        return this.api.v1.config.get('contentLanguage');
    }

    getNewCopyTemplate(options = {}) {
        /**
         * Get the new copy template
         * @param {object} options - The options (data) to be used in the new copy template
         */
        const newOptions = { ...options };
        if (!newOptions.language) {
            newOptions.language = this.selectedLanguage;
        }

        const sites = this.api.v1.user.getSites().map((site) => ({
            value: site.id, name: site.display_name
        }));
        const languages = this.languages.map((lang) => ({ name: lang.name, code: lang.code, selected: lang.code === newOptions.language }));
        const newCopy = this.api.v1.util.dom.renderTemplate(this.newCopyTemplate, {
            languages,
            sites,
            prototypes: [],
            languageSelectionName: newOptions.languageSelectionName || null
        }, true);

        if (!newOptions.elementId) {
            newOptions.elementId = `copy-${ this.newCopyId }`;
            this.newCopyId++;
        } else {
            newCopy.querySelector('.removeFromOverview').classList.add('lab-hidden');
        }
        newCopy.id = newOptions.elementId;

        if (newOptions.headerTitle) {
            newCopy.querySelector('h3').innerHTML = newOptions.headerTitle;
        }

        // Button to create linked copy
        newCopy.querySelector('#btnCreateLinkedCopy').addEventListener('click', () => {
            // this.setBusyState(newCopy, true);
            const prototypeId = newCopy.querySelector('select[name="prototype_id"]').value;
            // Oversett DENNE eller ORIGINALEN
            const articleId = this.rootModel.get('id');
            const replaceId = options.articleId || null;
            const selectedLanguage = newCopy.querySelector('select[name="languages"]').value;
            // const languageName = this.getLanguageName(selectedLanguage);
            if (selectedLanguage) {
                const progressBar = newCopy.querySelector(`#progress-meter`);
                this.updateProgressBar(progressBar, { setAttributeValues: { value: 1, max: 3 } });
                this.createCopy(articleId, prototypeId, replaceId).then((copyId) => {
                    this.fetchArticleData(copyId).then((data) => {
                        this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                        const currentPageLanguage = this.getPageLanguage();
                        const extraDataCurrent = {
                            fields: { hasTranslation: '1', seolanguage: currentPageLanguage }
                        };
                        this.overwriteNodeData(articleId, 'article', extraDataCurrent);
                        this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                        const extraData = {
                            fields: { seolanguage: selectedLanguage, hasTranslation: '1' }
                        };
                        this.overwriteNodeData(copyId, 'article', extraData);

                        const articleCopy = {
                            elementId: newCopy.id,
                            articleId: copyId,
                            title: 'New title',
                            seolanguage: selectedLanguage,
                            status: 'Draft'

                        };
                        articleCopy.title = data.title;
                        articleCopy.status = data.status;
                        console.log('Article articleCopy: ', articleCopy);
                        // this.setBusyState(newCopy, false);
                        this.updateProgressBar(progressBar, { finished: true });

                        this.updateCopyInOverview(articleCopy, true);
                    });
                });
            } else {
                // this.setBusyState(newCopy, false);
            }

        });

        // Button to create new translation
        newCopy.querySelector('#btnCreateNewTranslation').addEventListener('click', () => {
            newCopy.querySelector('.site_id').classList.add('lab-hidden');
            const progressBar = newCopy.querySelector(`#progress-meter`);
            progressBar.classList.remove('lab-hidden');
            this.updateProgressBarInfo(newCopy);
            this.hideTranslationSelections(newCopy);
            this.updateProgressBar(progressBar, { setAttributeValues: { value: 1, max: 10 } });

            // this.setBusyState(newCopy, true);

            const prototypeId = newCopy.querySelector('select[name="prototype_id"]').value;
            const articleId = this.rootModel.get('id');

            const replaceId = options.articleId || null;
            const selectedLanguage = newCopy.querySelector('select[name="languages"]').value;
            const languageName = this.getLanguageName(selectedLanguage);
            if (languageName) {
                this.createCopy(articleId, prototypeId, replaceId).then((copyId) => {
                    this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                    const currentPageLanguage = this.getPageLanguage();
                    const extraDataCurrent = {
                        fields: { hasTranslation: '1', seolanguage: currentPageLanguage }
                    };
                    this.overwriteNodeData(articleId, 'article', extraDataCurrent);
                    this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                    // Get new copy data - getNodeAndData
                    this.getNodeAndData(copyId).then((nodeData) => {
                    // Translate content - translateContent
                        this.updateProgressBar(progressBar, { updateAttributes: ['value'] });
                        const params = {
                            featureName: 'translateArticle',
                            language: languageName,
                            cleanUpJsonString: true,
                            updateModel: false
                        };
                        this.translateNode(nodeData, params, true)
                            .then((response) => {
                                this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                                response.fields.hasTranslation = '1';
                                response.fields.seolanguage = selectedLanguage;
                                for (const child of response.children) {
                                    this.updateProgressBar(progressBar, { updateAttributes: ['value'] });
                                    this.overwriteNodeData(child.id, child.type, child);
                                    if (child.children && child.children.length > 0) {
                                        for (const grandChild of child.children) {
                                            this.overwriteNodeData(grandChild.id, grandChild.type, grandChild);
                                        }
                                    }
                                }
                                this.overwriteNodeData(copyId, 'article', response)
                                    .then((r) => {
                                        this.updateProgressBar(progressBar, { updateAttributes: ['value'] });

                                        this.fetchArticleData(copyId).then((data) => {
                                            const articleCopy = {
                                                elementId: newCopy.id,
                                                articleId: copyId,
                                                title: data.title || '',
                                                language: languageName,
                                                status: data.status || 'Draft'

                                            };
                                            // this.setBusyState(newCopy, false);
                                            this.updateProgressBar(progressBar, { finished: true });
                                            this.updateCopyInOverview(articleCopy, true);
                                        });

                                    });
                            });
                    });

                });
            } else {
                // this.setBusyState(newCopy, false);

            }

        });

        // Use specified site name from config, as defined on multiLanguage admin page
        if (options.siteName) {
            const option = Array.from(newCopy.querySelector('select[name="site_id"]').querySelectorAll('option'))
                .find((opt) => opt.textContent.trim() === options.siteName.trim());
            if (option) {
                newCopy.querySelector('select[name="site_id"]').value = option.value;

            }
        }
        const siteId = newCopy.querySelector('select[name="site_id"]').value;
        this.updatePrototypeList(siteId, newCopy, options.prototypeName);

        const siteElement = newCopy.querySelector('.site_id');
        siteElement.addEventListener('change', (event) => {
            const selectedSiteId = event.target.value;
            this.updatePrototypeList(selectedSiteId, newCopy);
        });

        return newCopy;
    }

    getExistingCopyTemplate(options = {}) {
        /**
         * Get the existing copy template
         * @param {object} options - The options (data) to be used in the existing copy template
         */
        const languageCode = options.seolanguage;
        let languageName = languageCode ? this.getLanguageName(languageCode) : options.language;
        if (languageCode) {
            languageName = this.getLanguageName(languageCode);
        }

        let statusDescription = options.status || '';
        if (options.visibility_status === 'H') {
            statusDescription = 'Published hidden';
            if (options.status === 'A') {
                statusDescription += ', with unpublished changes';
            }
        } else if (options.visibility_status === 'P') {
            statusDescription = 'Published';
            if (options.status === 'A') {
                statusDescription += ', with unpublished changes';
            }
        } else {
            statusDescription = 'Draft';
        }
        const existingCopy = this.api.v1.util.dom.renderTemplate(this.existingCopyTemplate, {
            title: options.title || 'N/A',
            language: languageName,
            status: statusDescription,
            articleId: options.id || options.articleId || 'N/A'

        }, true);
        return existingCopy;
    }

    onAside() {
        /**
         * Aside menu for positioning the translate article function
         */
        return {
            section: 'Advanced',
            label: 'Translate article'
        };
    }

    onPaths() {
        /**
         * Paths for the translate article function
         */
        return {
            'fields.seolanguage': {
                node: 'fields.seolanguage'
            }
        };
    }

    fetchListOfCopies() {
        /**
         * Fetch list of copies of the current article to display in the overview
         */
        let lab_canonical_id;
        let query = '';
        const currentArticleId = this.rootModel.get('id');
        for (const path of ['lab_canonical_id', 'lab_canonical_extid', 'extid']) {
            try {
                const id = this.rootModel.get(`fields.${ path }`);
                if (id) {
                    if (query.length > 0) {
                        query += ` OR `;
                    }
                    query += `${ path }:${ id }`;
                }

                if (path === 'lab_canonical_id') {
                    lab_canonical_id = id;
                }
            } catch (error) {
                // Add correct syslogger
                // //console.log(`${ path } not found in current article`);
            }
        }
        const id = this.rootModel.get('id');
        if (id && id !== lab_canonical_id) {
            if (query.length > 0) {
                query += ` OR id:${ id }`;
            } else {
                query += `id:${ id }`;
            }
        }

        // If you are in the original article, then fetch all copied articles with that value set as lab_canonical_id
        if (id) {
            if (query.length > 0) {
                query += ` OR lab_canonical_id:${ id }`;
            } else {
                query += `lab_canonical_id:${ id }`;
            }
        }

        // If you are in an copied article, then that article has an lab_canonical_id
        // Use the value of lab_canonical_id to fetch the article with that value as id
        if (lab_canonical_id) {
            if (query.length > 0) {
                query += ` OR id:${ lab_canonical_id }`;
            } else {
                query += `id:${ lab_canonical_id }`;
            }
        }

        let url = `/api/v1/article?query=${ query }`;
        const returnFields = ['id', 'hasTranslations', 'hasTranslation', 'seolanguage', 'status', 'site_id', 'publishhidden', 'published', 'published_url', 'siteDomain', 'visibility_status', 'has_published', 'title'];
        url += `&fields=${ returnFields.join(',') }`;
        return fetch(url)
            .then((response) => response.json()).then((data) => {
                if (data && data.result && data.result.length > 0) {
                    const filteredArray = data.result.filter((item) => Number(item.id) !== currentArticleId);
                    return filteredArray;
                }
                return [];
            });
    }

    fetchArticleData(articleId) {
        /**
         * Fetch article data from article with given id
         * @param {number} articleId - The article id to fetch data from
         */
        const url = `/api/v1/article?query=id:${ articleId }`;
        return new Promise((resolve, reject) => {
            fetch(url)
                .then((response) => response.json())
                .then((data) => {
                    if (data && data.result && data.result.length > 0) {
                        resolve(data.result[0]);
                    }
                    resolve(null);
                })
                .catch((error) => reject(error));
        });

    }

    createCopy(originalArticleId, prototypeId, replaceId) {
        /**
         * Create a copy of the original article, may replace an existing article
         * @param {number} originalArticleId - The original article id
         * @param {number} prototypeId - The prototype id to copy the article to
         * @param {number} replaceId - The id of the article to replace
         */
        // ForceCopy is meant to be used to decide if an article creates a new version or not
        let ajaxUrl = `/ajax/article/copy-to-prototype/?articleId=${ originalArticleId }&prototype=${ prototypeId }`;
        if (replaceId) {
            ajaxUrl += `&replaceId=${ replaceId }&forceCopy=false`;
        } else {
            ajaxUrl += `&forceCopy=true`;
        }
        return this.api.v1.util.httpClient.request(ajaxUrl).then((resp) => {
            if (resp && resp.imported) {
                const imported = Object.values(resp.imported);
                if (imported.length > 0) {
                    return imported[0];
                }
            }
            return null;
        });
    }

    overwriteNodeData(nodeId, nodeType, data) {
        /**
         * Overwrite node data with new data
         * @param {number} nodeId - The node id to overwrite
         * @param {string} nodeType - The node type to overwrite, like 'article'
         */
        return new Promise((resolve, reject) => {
            const formData = this.buildFormData(nodeId, nodeType, data);
            if (formData) {
                fetch('/ajax/node/save-node-and-data', { body: formData, method: 'POST' })
                    .then((response) => {
                        resolve(response);
                    }).catch((error) => {
                        // //console.log('error: ', error);
                        reject(error);
                    });
            }
        });
    }

    buildFormData(id, type, data) {
        /**
         * Build formData for saving data in a node
         * @param {number} id - The node id
         * @param {string} type - The node type
         * @param {object} data - The data to be saved
         */
        if (!data) {
            return null;
        }
        let parsedData = data;
        if (typeof data !== 'object') {
            parsedData = JSON.parse(data);
        }
        const formContent = {
            id,
            type,
            fields: parsedData.fields
        };
        if (parsedData.fields && parsedData.fields.tags) {
            formContent.tags = parsedData.fields.tags;
            delete formContent.fields.tags;
        }

        const formData = new FormData();
        formData.append('json[id]', id);
        formData.append('json[type]', type);
        formData.append('json[structure]', null);
        formData.append('json[node]', JSON.stringify([formContent]));
        return formData;
    }

    getNodeAndData(id) {
        /**
         * Get data from a node id, including children.
         * Only return data that is supported for translation
         * @param {number} id - The node id to fetch data from
         */
        return new Promise((resolve, reject) => {
            fetch(`/prototype/get-node-and-data?id=${ id }`)
                .then((response) => response.json())
                .then((node) => {
                    const fieldsForTranslation = this.evaluateNodeDataSupport(node.data, true);
                    resolve(fieldsForTranslation);
                })
                .catch((error) => reject(error));
        });
    }

    evaluateNodeDataSupport(node = null, recursive = true) {
        /**
         * Evaluate node data for translation support
         * @param {object} node - The node data to be evaluated
         * @param {boolean} recursive - If the evaluation should be recursive
         */
        if (!node || !node.fields) {
            return null;
        }

        // Check if node is supported for translation
        if (this.translationTargets.elements[node.type] && this.translationTargets.elements[node.type].accept === false) {
            return null;
        }

        const supportedNodeData = {
            id: node.id,
            type: node.type,
            fields: {},
            path: {},
            children: []
        };
        for (const pathType of ['path', 'fields']) {
            const nodeData = pathType === 'path' ? node : node.fields;
            for (const field of Object.keys(nodeData)) {
                let elementRules;
                if (this.translationTargets.elements[node.type]) {
                    elementRules = this.translationTargets.elements[node.type];
                }
                let acceptField = false;

                // Evaluate globally first
                if (this.translationTargets.global[pathType] && this.translationTargets.global[pathType][field] && this.translationTargets.global[pathType][field] === true) {
                    acceptField = true;
                }

                // Check specific element rules
                if (elementRules && elementRules[pathType][field] && elementRules[pathType][field] === true) {
                    acceptField = true;
                } else if (elementRules && elementRules[pathType][field] && elementRules[pathType][field] === false) {
                    acceptField = false;
                }

                // Check field value with global regex rules - accept
                if (this.translationTargets.global.regex && this.translationTargets.global.regex.accept && Object.keys(this.translationTargets.global.regex.accept).length > 0) {
                    for (const key of Object.keys(this.translationTargets.global.regex.accept)) {
                        const regexRule = new RegExp(this.translationTargets.global.regex.accept[key]);
                        if (regexRule && regexRule.test(nodeData[field])) {
                            acceptField = true;
                        }
                    }
                }

                // Check field value with global regex rules - ignore
                if (this.translationTargets.global.regex && this.translationTargets.global.regex.ignore && Object.keys(this.translationTargets.global.regex.ignore).length > 0) {
                    for (const key of Object.keys(this.translationTargets.global.regex.ignore)) {
                        const regexRule = new RegExp(this.translationTargets.global.regex.ignore[key]);
                        if (regexRule && regexRule.test(nodeData[field])) {
                            acceptField = false;
                        }
                    }
                }

                // Check field value with element regex rule - ignore
                if (elementRules && elementRules.regex && elementRules.regex.ignore && Object.keys(elementRules.regex.ignore).length > 0) {
                    for (const key of Object.keys(elementRules.regex.ignore)) {
                        const regexRule = new RegExp(elementRules.regex.ignore[key]);
                        if (regexRule && regexRule.test(nodeData[field])) {
                            acceptField = false;
                        }
                    }
                }

                // Check field value for specific field with regex - accept
                if (elementRules && elementRules.regex && elementRules.regex.accept && Object.keys(elementRules.regex.accept).length > 0) {
                    for (const key of Object.keys(elementRules.regex.accept)) {
                        const regexRule = new RegExp(elementRules.regex.accept[key]);
                        if (regexRule && regexRule.test(nodeData[field])) {
                            acceptField = true;
                        }
                    }
                }

                // Store for translation
                if (acceptField === true) {
                    supportedNodeData[pathType][field] = nodeData[field];
                }
            }
        }

        if (recursive === true && node.children && node.children.length > 0) {
            for (const child of node.children) {
                const childData = this.evaluateNodeDataSupport(child, true);
                if (childData) {
                    supportedNodeData.children.push(childData);
                }
            }
        }
        if (Object.keys(supportedNodeData.fields).length > 0 || Object.keys(supportedNodeData.path).length > 0 || supportedNodeData.children.length > 0) {
            return supportedNodeData;
        }
        return null;
    }

    prepareNewCopy() {
        /**
         * Prepare a new element with new copy template to be used in the overview
         */
        const copiesOverview = this.markup.querySelector('#copiesOverview');
        const newCopy = this.getNewCopyTemplate();

        const removeFromOverview = newCopy.querySelector('.removeFromOverview');
        removeFromOverview.addEventListener('click', () => {
            copiesOverview.removeChild(newCopy);
        });

        copiesOverview.prepend(newCopy);

    }

    setupPrototypes() {
        /**
         * Setup prototypes
         */

        // Protoype config
        return new Promise((resolve, reject) => {
            const urlPrototypes = '/ajax/articlePrototype/get-all';
            lab_api.v1.util.httpClient.request(urlPrototypes)
                .then((resp) => {

                    const data = resp.data.map((prototype) => ({
                        value: prototype.id,
                        name: prototype.name,
                        site: prototype.site
                    }));
                    this.prototypes = data;
                    resolve(data);
                });
        });

    }

    updatePrototypeList(siteId, htmlElement, prototypeName = null) {
        /**
         * Update the prototype list based on the selected site
         * @param {number} siteId - The site id to filter prototypes by
         * @param {HTMLElement} htmlElement - The html element to update the prototype list in
         * @param {string} prototypeName - The prototype name to be selected
         */
        this.setupPrototypes().then(() => {
            let sitePrototypes = this.prototypes.filter((prototype) => Number(prototype.site) === Number(siteId));
            if (prototypeName) {
                sitePrototypes = sitePrototypes.map((prototype) => ({ ...prototype, selected: prototype.name === prototypeName }));
            }
            for (const buttonSelector of ['#btnCreateNewTranslation', '#btnCreateLinkedCopy']) {
                const btn = htmlElement.querySelector(buttonSelector);
                if (!sitePrototypes || sitePrototypes.length === 0) {
                    btn.classList.add('lab-disabled');
                } else if (btn.classList.contains('lab-disabled')) {
                    btn.classList.remove('lab-disabled');
                }
            }
            const prototypeElement = htmlElement.querySelector('.prototype_id');

            const prototypeHtml = `
            <select name="prototype_id" id="prototype_id">
                {{#prototypes}}
                <option value="{{value}}" {{#selected}}selected{{/selected}}>{{name}}</option>
                {{/prototypes}}
            </select>`;
            const prototypeMarkup = this.api.v1.util.dom.renderTemplate(prototypeHtml, {
                prototypes: sitePrototypes
            }, true);
            prototypeElement.innerHTML = prototypeMarkup.innerHTML;
        });
    }

    translateContent(params) {
        /**
         * Translate content with the text assistant Labrador AI
         */
        return new Promise((resolve, reject) => {
            const res = this.api.v1.ns.get('textAssistant.generateContent')(this.rootModel, null, null, params);
            resolve(res);

        });

    }

    translateNode(node, params, splitBodytext = false) {
        /**
         * Translate a node with the text assistant Labrador AI
         * Returns a promise
         * @param {object} node - The node to be translated
         * @param {object} params - The parameters to be used for translation
         * @param {boolean} splitBodytext - If the bodytext should be splitted into smaller parts
         */
        return new Promise((resolve, reject) => {
            const promises = [];

            // BODYTEXT
            // Split bodytext into smaller parts
            if (splitBodytext === true && node.fields && node.fields.bodytext) {
                const splittedBodytext = this.splitText(node.fields.bodytext);
                for (const i of Object.keys(splittedBodytext)) {
                    const content = JSON.stringify({ [`bodytext_${  i }`]: splittedBodytext[i] });
                    const paramsBodytext = params;
                    paramsBodytext.articleFields = content;
                    const result = this.translateContent(paramsBodytext);
                    promises.push(result);

                }
            }

            // FIELDS (not bodytext)
            const articleFields = node.fields;
            if (articleFields.bodytext) {
                delete articleFields.bodytext;
            }
            // For key not fields
            if (node.path) {
                for (const key of Object.keys(node.path)) {
                    articleFields[key] = node.path[key];
                }
            }

            const content = JSON.stringify(articleFields);
            const paramsWithoutBodytext = params;
            paramsWithoutBodytext.articleFields = content;
            const result = this.translateContent(paramsWithoutBodytext);
            promises.push(result);

            // CHILDREN
            if (node.children && node.children.length > 0) {
                this.childrenContent = this.prepareChildrenForTranslation(node.children);
                this.childrenContent = JSON.stringify(this.childrenContent);
                const paramsChildren = params;
                paramsWithoutBodytext.articleFields = this.childrenContent;
                const resultChildren = this.translateContent(paramsChildren);
                promises.push(resultChildren);

            }

            Promise.all(promises)
                .then((resultFromPromises) => {
                    const bodytextPartials = {};
                    const translatedChildrenContent = {};
                    const translation = {
                        fields: {},
                        children: []
                    };
                    if (this.childrenContent && typeof this.childrenContent === 'string') {
                        this.childrenContent = JSON.parse(this.childrenContent);
                    } else if (!this.childrenContent) {
                        this.childrenContent = {};
                    }
                    for (const r of resultFromPromises) {
                        const data = JSON.parse(r);
                        for (const key of Object.keys(data)) {
                            if (key.includes('bodytext_')) {
                                bodytextPartials[key] = data[key];
                            } else if (this.childrenContent[key]) {
                                translatedChildrenContent[key] = data[key];
                            } else {
                                translation.fields[key] = data[key];
                            }
                        }

                    }
                    let bodytext = '';
                    for (let i = 1; i <= Object.keys(bodytextPartials).length; i++) {
                        bodytext += bodytextPartials[`bodytext_${ i }`];

                    }
                    translation.fields.bodytext = bodytext;

                    if (this.childrenContent) {
                        translation.children = this.handleTranslatedChildren(translatedChildrenContent);
                    }
                    resolve(translation);
                });

        });
    }

    handleTranslatedChildren(children) {
        /**
         * Handle translated children
         * @param {object} children - The children to be translated
         * @returns {array} - The translated children
         */
        const translatedChildren = {};
        for (const key of Object.keys(children)) {
            const [type, id, field] = key.split('_');
            if (!translatedChildren[`${ type }_${ id }`]) {
                translatedChildren[`${ type }_${ id }`] = { type, id, fields: {} };
            }
            translatedChildren[`${ type }_${ id }`].fields[field] = children[key];
        }
        return Object.values(translatedChildren);

    }

    prepareChildrenForTranslation(children) {
        /**
         * Prepare children for translation
         * @param {object} children - The children to be translated
         */
        const childrenToTranslate = {};
        for (const child of children) {
            const childKey = `${ child.type }_${ child.id }`;
            for (const field of Object.keys(child.fields)) {
                childrenToTranslate[`${ childKey }_${ field }`] = child.fields[field];
            }
            if (child.tags) {
                childrenToTranslate[`${ childKey }_tags`] = child.tags;
            }
            if (child.children && child.children.length > 0) {
                const grandchildren = this.prepareChildrenForTranslation(child.children);
                if (grandchildren) {
                    for (const key of Object.keys(grandchildren)) {
                        childrenToTranslate[key] = grandchildren[key];
                    }
                }

            }
        }

        return childrenToTranslate;
    }

    updateProgressBar(progressBar, options) {
        /**
         * Update the progress meter
         * @param {number} update - The amount to update the progress meter
         */
        /*
        if (!progressBar.classList.contains('lab-busy')) {
            progressBar.classList.add('lab-busy');
        } */
        if (options.updateAttributes) {
            for (const attributeType of options.updateAttributes) {
                let attributeValue = progressBar.getAttribute(attributeType);
                if (!attributeValue) {
                    attributeValue = 0;
                } else {
                    attributeValue = Number(attributeValue);
                }
                progressBar.setAttribute(attributeType, attributeValue + 1);
            }
        }
        if (options.setAttributeValues) {
            for (const attribute of Object.keys(options.setAttributeValues)) {
                progressBar.setAttribute(attribute, options.setAttributeValues[attribute]);
            }
        }

        if (options.finished === true) {
            // progressBar.classList.add('lab-hidden');
            progressBar.setAttribute('value', 10);
            progressBar.setAttribute('max', 10);
        }

    }

    updateProgressBarInfo(htmlElement) {
        /**
         * Update the progress bar info
         * @param {HTMLElement} htmlElement - The html element to update the progress bar info in
         */
        const articleCopyElement = htmlElement;
        const siteName = articleCopyElement.querySelector('select[name="site_id"]').selectedOptions[0].textContent;
        const prototypeName = articleCopyElement.querySelector('select[name="prototype_id"]').selectedOptions[0].textContent;
        const languageName = articleCopyElement.querySelector('select[name="languages"]').selectedOptions[0].textContent;
        if (siteName && prototypeName && languageName) {
            const infoText = `Translating article to <b>${ languageName }</b> for <b>${ siteName }</b> using <b>${ prototypeName }</b>`;
            const progressBarInfo = articleCopyElement.querySelector(`#progress-info`);
            progressBarInfo.innerHTML = infoText;
            progressBarInfo.classList.remove('lab-hidden');
        }
        const title = articleCopyElement.querySelector('h3');
        if (title.textContent.includes('Create')) {
            title.textContent = title.textContent.replace('Create', 'Translating');
        }
    }

    hideTranslationSelections(htmlElement) {
        /**
         * Hide translation selections
         * @param {HTMLElement} htmlElement - The html element to hide translation selections in
         */
        htmlElement.querySelectorAll('.translationSelection').forEach((selection) => {
            selection.classList.add('lab-hidden');
        });
    }

}
