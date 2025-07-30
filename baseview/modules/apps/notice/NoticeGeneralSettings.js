export class NoticeGeneralSettings {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.helpers = params.helpers;
        this.enabled = true;
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid" id="convert-container">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium">Convert</h2>
                <p class="lab-info">
                    When converting to article this notice will be hidden from Google and redirected to the new article.
                    Title, bodytext, tags and images will be copied. The article will be created using the selected prototype.
                </p>
                {{ #fields.convertedToArticleId }}
                <p class="lab-para">
                    <b>This notice is already converted to an article.</b><br>
                    <a href="/edit/article/id/{{ fields.convertedToArticleId }}" target="_blank" class="lab-btn">Edit article</a>
                    <a href="{{{ frontDomain }}}/a/{{ fields.convertedToArticleId }}" target="_blank" class="lab-btn">View article</a>
                </p>
                {{ /fields.convertedToArticleId }}
                
                {{ ^fields.convertedToArticleId }}
                <div class="lab-formgroup-item lab-grid-large-6" id="prototype-error-container">
                    <label>Select article prototype to use</label>
                    <div id="prototype-container" class="lab-busy" style="position: relative; padding-top: 10px;">Loading prototypes ...</div>
                    <!-- Prototype selector will render here -->
                </div>
                <div class="lab-formgroup-item lab-grid-large-4 lab-grid-gap">
                    <label for="convert_button">Create article</label>
                    <input type="button" value="Convert to article" id="convert_button">
                </div>
                {{ /fields.convertedToArticleId }}
            </div>
            <div class="lab-formgroup lab-grid">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium">SEO</h2>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="norobots">Hide from Google</label>
                    <input type="checkbox" value="1" name="fields.norobots" id="norobots" {{ #fields.norobots }}checked{{ /fields.norobots }}>
                </div>
            </div>
            <div class="lab-formgroup lab-grid">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium">Commercial settings</h2>
                <div class="lab-formgroup-item lab-grid-large-12 lab-inline">
                    <label for="hideAds">Hide ads</label>
                    <input type="checkbox" name="fields.hideAds" id="hideAds" value="1" {{ #fields.hideAds }}checked{{ /fields.hideAds }}>
                </div>
            </div>
        </div>`;
    }

    onAside() {
        return {
            section: 'General',
            label: 'Settings'
        };
    }

    onPaths() {
        return {
            'fields.norobots': {
                node: 'fields.norobots',
                boolean: true
            },
            'fields.hideAds': {
                node: 'fields.hideAds',
                boolean: true,
                suggestReload: true
            }
        };
    }

    onMarkup() {
        const markup = this.api.v1.util.dom.renderTemplate(this.template, {
            fields: {
                norobots: this.rootModel.get('fields.norobots'),
                convertedToArticleId: this.rootModel.get('fields.convertedToArticleId'),
                hideAds: this.helpers.toBoolean(this.rootModel.get('fields.hideAds'))
            },
            frontDomain: this.api.v1.site.getSite().domain
        }, true);

        // Get all article prototypes
        this.api.v1.util.httpClient.get('/ajax/articlePrototype/get-all').then((response) => {
            const prototypeContainer = markup.querySelector('#prototype-container');
            if (prototypeContainer) {
                const prototypeSelect = this.api.v1.ui.element.getPrototypeSelector({
                    siteId: this.api.v1.site.getSite().id,
                    prototypes: response.data
                });
                prototypeContainer.innerHTML = '';
                prototypeContainer.removeAttribute('style');
                prototypeContainer.appendChild(prototypeSelect);
                const convertBtn = markup.querySelector('#convert_button');
                if (convertBtn) {
                    convertBtn.addEventListener('click', () => {
                        const errorContainer = markup.querySelector('#prototype-error-container');
                        const convertContainer = markup.querySelector('#convert-container');
                        if (prototypeSelect.value) {
                            errorContainer.classList.remove('lab-validation-error');
                            this.convertToArticle(this.rootModel.get('id'), prototypeSelect.value, convertContainer);
                        } else {
                            errorContainer.classList.add('lab-validation-error');
                        }
                    });
                }
                prototypeContainer.classList.remove('lab-busy');
            }
        }).catch((error) => {
            console.error('error', error);
        });
        return markup;
    }

    convertToArticle(pageId, prototypeId, container) {
        container.classList.add('lab-busy');
        this.api.v1.util.httpClient.get(`/ajax/article/copy-to-prototype/?articleId=${ pageId }&prototype=${ prototypeId }`, { resetCache: true }).then((response) => {
            if (response.imported && response.imported[pageId]) {
                const articleId = response.imported[pageId];
                if (articleId) {
                    this.rootModel.set('fields.lab_redirect_url', `${ this.api.v1.site.getSite().domain }/a/${ articleId }`);
                    this.rootModel.set('fields.norobots', '1');

                    // Note: If this notice has set 'fields.lab_redirect_url' then the copy will also set it on the article.
                    // This can lead to a redirect loop. Remove it from the copy.
                    // Todo: Create support for blacklisting fields in the copy-to-prototype endpoint.
                    const data = {
                        type: 'article',
                        id: articleId,
                        fields: {
                            lab_redirect_url: '',
                            convertedFromNoticeId: `${ pageId }`
                        }
                    };
                    const formData = new FormData();
                    formData.append(`json[id]`, articleId);
                    formData.append(`json[type]`, 'notice');
                    formData.append(`json[node]`, JSON.stringify([data]));
                    formData.append(`json[structure]`, JSON.stringify([]));
                    formData.append(`lockId`, articleId);
                    const params = {
                        body: formData,
                        method: 'POST'
                    };
                    fetch('/ajax/node/save-node-and-data', params)
                        .then((resp) => resp.json())
                        .then(() => {
                            this.rootModel.set('fields.convertedToArticleId', `${ articleId }`);
                            this.api.v1.ui.modal.close();
                            this.api.v1.ui.modal.dialog({
                                container: {
                                    state: {
                                        ok: true
                                    }
                                },
                                content: {
                                    title: 'Notice converted to article',
                                    description: `This notice will be redirected to the new <a target="_blank" href="/edit/article/id/${ articleId }">article</a> (${ articleId }) when displayed on the front servers by your readers. Remember to publish this notice to apply the redirect changes.`
                                },
                                footer: {
                                    buttons: [
                                        {
                                            value: 'Cancel',
                                            id: 'cancel_button',
                                            highlight: false
                                        },
                                        {
                                            value: 'OK - Publish notice',
                                            type: 'submit',
                                            highlight: true
                                        }
                                    ]
                                },
                                eventHandlers: [{
                                    selector: '#cancel_button',
                                    event: 'click',
                                    callback: (modal, event) => {
                                        modal.close();
                                    }
                                }],
                                callbacks: {
                                    submit: (formValues) => {
                                        this.api.v1.app.publish();
                                    }
                                }
                            });
                            this.api.v1.app.gotoUrl(`/edit/article/id/${ articleId }`, true);
                        })
                        .catch((error) => {
                            container.classList.remove('lab-busy');
                            console.log('error', error);
                        });
                }
            }
        }).catch((error) => {
            container.classList.remove('lab-busy');
            console.error('Error copying article', error);
        });
    }

}
