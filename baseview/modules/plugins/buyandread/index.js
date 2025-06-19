import BuyAndRead from './buyandread.js';

export default {
    name: 'BuyAndRead',
    description: 'Push message to app using BuyAndRead',
    version: '1.0.0',
    predicate: (api) => api.v1.config.get('plugins.buyandread.active'),
    entry: class {

        onReady(api) {
            api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/buyandread/buyandread-main.css');

            let buyAndReadInstance = null;

            const btn = api.v1.util.dom.renderTemplate('<li class="lab-item lab-btn labicon-buyandread" title="BuyAndRead"></li>', {}, true);
            document.querySelector('#labrador-menu ul li.lab-menulist ul').appendChild(btn);
            btn.addEventListener('click', (event) => {
                const config = api.v1.config.get('plugins.buyandread');
                if (!config.providerId) {
                    const missingFields = [
                        !config.providerId && 'Provider ID'
                    ].filter(Boolean).join(', ');

                    Sys.logger.warn(`[BuyAndRead] Required config missing: ${ missingFields }. BuyAndRead will not run.`);
                    api.v1.ui.modal.dialog({
                        container: { state: { warning: true } },
                        content: {
                            title: 'BuyAndRead not configured',
                            description: `Required configuration missing: ${ missingFields }.<br>Set up BuyAndRead in the <a href="/settings/cp?page=plugins" target="_blank">admin-page</a>.`
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

                if (!buyAndReadInstance) {
                    buyAndReadInstance = new BuyAndRead();
                    buyAndReadInstance.onReady(api, config);
                }
                buyAndReadInstance.showPushModal();
            }, false);
        }

    }
};
