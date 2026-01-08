export default {
    name: 'Tansa',
    description: 'Proofreading from Tansa',
    version: '1.0.1',
    predicate: (api) => (api.v1.model.root.getType() === 'page_article' || api.v1.model.root.getType() === 'page_notice') && api.v1.config.get('tansa.active'),
    entry: class {

        onReady(api) {
            api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/tansa/tansa-main.css');

            // Add Tansa-attribute to iframe:
            document.querySelector('iframe[data-lab-viewport="desktop"]').setAttribute('tansa-proofing', 'true');

            let tansaInstance = null;

            const btn = api.v1.util.dom.renderTemplate('<li class="lab-item lab-btn labicon-tansa" title="Tansa"></li>', {}, true);
            document.querySelector('#labrador-menu ul li.lab-menulist ul').appendChild(btn);
            btn.addEventListener('click', (event) => {
                const config = api.v1.config.get('tansa');
                if (!config.licenseKey || !config.baseUrl) {
                    Sys.logger.warn('[Tansa] Required config "licenseKey" or "baseUrl" missing. Tansa will not run.');
                    api.v1.ui.modal.dialog({
                        container: { state: { warning: true } },
                        content: {
                            title: 'Tansa not configured',
                            description: 'Required config "licenseKey" or "baseUrl" missing. Tansa will not run.<br>Set up Tansa in the <a href="/settings/cp?page=tansa" target="_blank">admin-page</a>.'
                        },
                        footer: {
                            buttons: [
                                {
                                    type: 'submit',
                                    value: 'OK',
                                    highlight: true
                                }
                            ]
                        }
                    });
                    return;
                }

                const elements = api.v1.util.defaults.object(config.elements, {
                    kicker: true, title: true, subtitle: true, bodytext: true, images: true, factboxes: true, articles: true
                });
                const targets = [];
                // Add entry to the array. Each entry will be a target for Tansa and the text value of each path will be spellchecked.
                // If dispatchEvent is true, the element will be updated when Tansa is done using connected text tool.
                // If false (default), the element will be updated using standard set method.
                const pusher = (model, domModel, selector, path, dispatchEvent = false) => {
                    targets.push({
                        model, domModel, selector, dispatchEvent, value: '', path
                    });
                };
                if (elements.kicker) {
                    pusher(api.v1.model.query.getModelByType('articleHeader'), null, '.kicker', 'fields.kicker');
                }
                if (elements.title) {
                    pusher(api.v1.model.query.getModelByType('articleHeader') || api.v1.model.query.getModelByType('noticeHeader'), null, '.headline', 'fields.title');
                }
                if (elements.subtitle) {
                    pusher(api.v1.model.query.getModelByType('articleHeader'), null, '.subtitle', 'fields.subtitle');
                }
                if (elements.images) {
                    const topImage = api.v1.model.query.getModelByPath('articleHeader/image');
                    const images = api.v1.model.query.getModelsByPath('bodytext/image');
                    if (topImage) {
                        // Caption is edited by the articleHeader, not the image itself:
                        pusher(topImage, topImage.getParent(), 'figcaption[itemprop="caption"]', 'fields.imageCaption');
                        pusher(topImage, topImage.getParent(), 'figcaption[itemprop="author"]', 'fields.byline');
                    }
                    for (const image of images) {
                        pusher(image, null, 'figcaption[itemprop="caption"]', 'fields.imageCaption');
                        pusher(image, null, 'figcaption[itemprop="author"]', 'fields.byline');
                    }
                }
                if (elements.articles) {
                    const articleTeasers = api.v1.model.query.getModelsByPath('bodytext/article');
                    for (const article of articleTeasers) {
                        pusher(article, null, '.headline', 'fields.title');
                        pusher(article, null, '.subtitle', 'fields.subtitle');
                        pusher(article, null, '.kicker', 'fields.kicker');
                        const image = api.v1.model.query.getChildOfType(article, 'image');
                        if (image) {
                            pusher(image, article, 'figcaption[itemprop="caption"]', 'fields.imageCaption');
                            pusher(image, article, 'figcaption[itemprop="author"]', 'fields.byline');
                        }
                    }
                }
                if (elements.factboxes) {
                    const factboxes = api.v1.model.query.getModelsByPath('bodytext/factbox');
                    for (const factbox of factboxes) {
                        pusher(factbox, null, 'h2', 'fields.title');
                        pusher(factbox, null, '.fact', 'fields.bodytext', true);
                    }
                }
                // Note: Add after other child-elements requiring dispatchEvent=true (factbox).
                if (elements.bodytext) {
                    pusher(api.v1.model.query.getModelByType('bodytext'), null, null, 'fields.bodytext', true);
                }

                const addedConfig = {
                    ...config,
                    clientExtenstionJs: 'tansa4ClientExtensionSimple.js',
                    userId: api.v1.user.getUserEmail(),
                    parentAppId: 'ed527f00-6109-11ed-b10c-5974977ab271',
                    parentAppVersion: '',
                    requireProofingAttribute: 'true'
                };

                if (tansaInstance) {
                    const rect = btn.getBoundingClientRect();
                    setTimeout(() => {
                        tansaInstance.load(targets, addedConfig, rect);
                    }, 300);
                    return;
                }

                import('./tansa.js').then((module) => {
                    const rect = btn.getBoundingClientRect();
                    tansaInstance = module.tansa;
                    setTimeout(() => {
                        module.tansa.load(targets, addedConfig, rect);
                    }, 300);
                }).catch((error) => {
                    Sys.logger.warn(`Error loading Tansa-functionality: ${ error }`);
                });
            }, false);
        }

    }
};
