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
                key: 'b',
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

    // Display a modal for configuring and sending the push notification
    showPushModal() {
        const pageData = this.getPageData();
        const titleText = this.stripHtmlTags(pageData.title || '');
        const subtitleText = this.stripHtmlTags(pageData.subtitle || '');

        this.api.v1.ui.modal.dialog({
            content: {
                title: 'Send BuyAndRead Push Notification',
                description: `
                    <div class="lab-formgroup">
                        <div class="lab-formgroup-item">
                            <label for="buyandreadTitle">Title:</label>
                            <input type="text" id="buyandreadTitle" class="lab-input" value="${ this.config.defaultTitle || titleText || '' }">
                        </div>
                        <div class="lab-formgroup-item">
                            <label for="buyandreadBody">Message:</label>
                            <textarea id="buyandreadBody" class="lab-input">${ this.config.defaultMessage || subtitleText || '' }</textarea>
                        </div>
                        <div class="lab-formgroup-item">
                            <label for="buyandreadUrl">Custom Article URL (Optional):</label>
                            <input type="text" id="buyandreadUrl" class="lab-input" value="">
                        </div>
                        <div class="lab-formgroup-item">
                            <label for="excludeParams">Send notification without linking to article:</label>
                            <input type="checkbox" id="excludeParams" ${ this.config.excludeParamsDefault ? 'checked' : '' }>
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
                    const title = document.getElementById('buyandreadTitle').value;
                    const message = document.getElementById('buyandreadBody').value;
                    const customUrl = document.getElementById('buyandreadUrl').value;
                    const excludeParams = document.getElementById('excludeParams').checked;
                    this.publish(title, message, customUrl, excludeParams);
                }
            }
        });
    }

    // Retrieve relevant data about the current page
    getPageData() {
        const root = this.api.v1.model.query.getRootModel();
        const site = this.api.v1.site.getSite();
        return {
            type: root.get('type'),
            id: root.get('id'),
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

    // Publish a push notification with the provided title and body,
    publish(customTitle, customBody, customUrl, excludeParams) {
        const pageData = this.getPageData();

        if (pageData.visibility_status === 'P' && pageData.publishhidden !== '1') {
            const params = new URLSearchParams({
                title: customTitle,
                message: customBody
            });

            if (!excludeParams) {
                const url = customUrl || pageData.url; // Use custom URL if provided, otherwise use the page URL
                params.append('url', url);
            }

            // Construct the request URL
            const requestUrl = `https://www.buyandread.com/servlet/api/${ this.config.providerId }/provider/v1/app/sendPushMessage?${ params.toString() }`;

            Sys.logger.debug('[BuyAndRead]: Sending push message...');

            // Prepare the payload for the API call
            const formData = new FormData();
            const payload = {
                site: pageData.site.alias,
                request_url: requestUrl
            };
            formData.append('payload', JSON.stringify(payload));

            // Make the API call to send the push notification
            this.api.v1.util.httpClient.request(
                '/ajax/buyandread/post',
                {
                    method: 'POST',
                    body: formData
                }
            ).then((response) => response).then((data) => {
                // If success is false, reject the promise with an error
                if ((data && data.success === false) || data === '') {
                    const errorMessage = `Contact us or <a href="https://www.buyandread.com/" target="_blank">BuyAndRead</a> if the error persists.<br>
                    <b>Status from BuyAndRead:</b> ${ data.statusDesc || 'Push notification failed' }`;

                    return Promise.reject(new Error(errorMessage));
                }

                // Success message, and details about the push notification
                Sys.logger.debug('[BuyAndRead]: Successfully sent push message.', data);
                const successMessage = `Push notification successfully sent!`;
                /* For a more detailed response, uncomment the following lines and add the desired fields:
                Response:<br>\n\n
                <b>Success:</b> ${data.success}<br>
                <b>Scheduled:</b> ${data.scheduled}<br>
                <b>Description:</b> ${data.statusDesc || 'Push notification sent successfully!'}<br>
                <b>Status code:</b> ${data.statusCode}<br>
                <b>Title:</b> ${params.get('title') || 'N/A'}<br>
                <b>Message:</b> ${params.get('message') || 'N/A'}<br>
                <b>Article ID:</b> ${params.get('articleId') || 'N/A'}<br>
                <b>URL:</b> ${params.get('url') || 'N/A'}<br>
                */

                this.showResultModal('Success', successMessage, false);
            }).catch((error) => {
                // Error message if the API call fails, or the response is not as expected
                Sys.logger.error('[BuyAndRead]: Failed to send push message.', error);
                const errorMessage = (error.message ? `<br>\n\n${  error.message }` : '');

                this.showResultModal('Error - Push request failed!', errorMessage, true);
            });
        } else {
            // Error message if the page is not published visibly
            Sys.logger.warn('[BuyAndRead]: Page not published visibly, failed to send push message.');
            this.showResultModal('Error', 'Page must be published and visible to send push notifications.', true);
        }
    }

    // Display a modal with the result of the push notification send
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
