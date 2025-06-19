export default class {

    constructor() {
        this.api = null;
        this.config = null;
        this.keyEvent = null;
    }

    onReady(api, config) {
        this.api = api;
        this.config = config;
        this.start();
    }

    start() {
        if (this.api && this.config.active) {
            this.keyEvent = this.api.v1.util.keyEventHandler.add({
                key: 'u',
                callback: () => this.showPushModal(),
                controlkeys: ['labCtrlKey', 'shiftKey'],
                overrideDisable: false
            });
        }
    }

    stop() {
        if (this.api) {
            this.api.v1.util.keyEventHandler.remove(this.keyEvent);
        }
    }

    stripHtmlTags(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent;
    }

    showPushModal() {
        const pageData = this.getPageData();
        const titleText = this.stripHtmlTags(pageData.title || '');
        const subtitleText = this.stripHtmlTags(pageData.subtitle || '');

        this.api.v1.ui.modal.dialog({
            content: {
                title: 'Send Subrite Push Notification',
                description: `
                    <div class="lab-formgroup">
                        <div class="lab-formgroup-item">
                            <label for="subriteTitle">Title</label>
                            <input type="text" id="subriteTitle" class="lab-input" value="${ this.config.defaultTitle || titleText  || '' }">
                        </div>
                        <div class="lab-formgroup-item">
                            <label for="subriteBody">Body</label>
                            <textarea id="subriteBody" class="lab-input">${ this.config.defaultMessage || subtitleText || '' }</textarea>
                        </div>
                    </div>
                `
            },
            footer: {
                buttons: [
                    {
                        value: 'Cancel',
                        id: 'cancel_button',
                        highlight: false
                    },
                    {
                        value: 'Send Push',
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
                submit: () => {
                    const title = document.getElementById('subriteTitle').value;
                    const body = document.getElementById('subriteBody').value;
                    this.publish(title, body);
                }
            }
        });
    }

    getPageData() {
        const root = this.api.v1.model.query.getRootModel();
        const site = this.api.v1.site.getSite();
        return {
            type: root.get('type'),
            id: root.get('id'),
            tags: root.get('tags'),
            section: root.get('primaryTags.section'),
            title: root.get('fields.title'),
            subtitle: root.get('fields.subtitle'),
            url: (this.api.v1.site.getSite().domain || this.api.v1.properties.get('customer_front_url')) + root.get('fields.published_url'),
            status: root.get('status'),
            visibility_status: root.get('fields.visibility_status'),
            publishhidden: root.get('fields.publishhidden'),
            site: {
                alias: site.alias
            }
        };
    }

    publish(customTitle, customBody) {
        const pageData = this.getPageData();

        if (pageData.visibility_status === 'P' && pageData.publishhidden !== '1') {
            const data = {
                title: customTitle,
                body: customBody,
                data: {
                    url: pageData.url
                },
                topics: pageData.tags
            };

            Sys.logger.debug('[Subrite]: Sending push message...');

            const formData = new FormData();
            const payload = {
                site: pageData.site.alias,
                request_url: 'https://api.subrite.no/api/v1/app-push/pushcontent',
                data: JSON.stringify(data)
            };
            formData.append('payload', JSON.stringify(payload));

            this.api.v1.util.httpClient.request(
                '/ajax/subrite/post',
                {
                    method: 'POST',
                    body: formData
                }
            ).then((response) => response).then((responseData) => {
                if ((responseData && responseData.status !== 'created') || responseData === '') {
                    const errorMessage = `Contact us the error persists.<br>
                    <b>Status response:</b> ${ JSON.stringify(responseData) || 'Push notification failed' }`;

                    return Promise.reject(new Error(errorMessage));
                }

                Sys.logger.debug('[Subrite]: Successfully sent push message.');
                this.showResultModal('Success!', 'Push notification sent successfully!', false);
            }).catch((error) => {
                Sys.logger.error('[Subrite]: Failed to send push message.', error);
                const errorMessage = (error.message ? `<br>\n\n${  error.message }` : '');

                this.showResultModal('Error - Push request failed!', errorMessage, true);
            });
        } else {
            Sys.logger.warn('[Subrite]: Page not published visibly, failed to send push message.');
            this.showResultModal('Error', 'Page must be published and visible to send push notifications.', true);
        }
    }

    showResultModal(title, message, isError) {
        this.api.v1.ui.modal.dialog({
            container: {
                state: isError ? 'error' : 'success'
            },
            content: {
                title,
                description: message
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
    }

}
