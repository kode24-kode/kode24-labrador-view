import PushNotification from './pushnotification.js';

export default {
    name: 'PushNotification',
    description: 'Unified push notification system',
    version: '1.0.0',
    predicate: (api) => api.v1.config.get('plugins.pushnotification.active'),
    entry: class {

        onReady(api) {
            api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/pushnotification/pushnotification-main.css');

            let pushNotificationInstance = null;

            const btn = api.v1.util.dom.renderTemplate('<li class="lab-item lab-btn labicon-pushnotification" title="Push Notification"></li>', {}, true);
            document.querySelector('#labrador-menu ul li.lab-menulist ul').appendChild(btn);
            btn.addEventListener('click', (event) => {
                const config = api.v1.config.get('plugins.pushnotification');

                if (!config.vendor) {
                    api.v1.ui.modal.dialog({
                        container: { state: { warning: true } },
                        content: {
                            title: 'Push Notification not configured',
                            description: 'Please select a vendor in the <a href="/settings/cp?page=plugins" target="_blank">admin-page</a>.'
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

                if (config.vendor === 'buyandread' && !config.providerId) {
                    api.v1.ui.modal.dialog({
                        container: { state: { warning: true } },
                        content: {
                            title: 'BuyAndRead not configured',
                            description: 'Required configuration missing: Provider ID.<br>Set up BuyAndRead in the <a href="/settings/cp?page=plugins" target="_blank">admin-page</a>.'
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

                if (!pushNotificationInstance) {
                    pushNotificationInstance = new PushNotification();
                    pushNotificationInstance.onReady(api, config);
                }
                pushNotificationInstance.showPushModal();
            }, false);
        }

    }
};
