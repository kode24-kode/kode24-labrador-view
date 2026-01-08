/**
 * Push Notification Manager
 *
 * Handles sending push notifications to different vendors (Subrite, BuyAndRead, Forte).
 */
export default class {

    constructor() {
        this.api = null;
        this.config = null;
        this.keyEvent = null;
        this.topicsField = null; // Store reference to topics field for retrieval
    }

    /**
     * Initializes the plugin when Lab is ready
     * @param {Object} api - The Lab API object
     * @param {Object} config - Configuration object containing:
     *   - active: boolean - Whether the plugin is enabled
     *   - vendor: string - The push notification vendor ('subrite', 'buyandread', 'forte')
     *   - defaultTitle: string - Default notification title to be placed in the modal
     *   - defaultMessage: string - Default notification message to be placed in the modal
     *   - providerId: string - BuyAndRead provider ID (required for BuyAndRead)
     *   - excludeParamsDefault: boolean - Default state for excluding URL params (BuyAndRead)
     *   - topicString: string - Comma-separated topics for Forte
     *   - baseUrl: string - Base API URL for Forte
     */
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

    /**
     * Removes HTML tags from a string, returning plain text
     * @param {string} html - HTML string to strip
     * @returns {string} Plain text content
     */
    stripHtmlTags(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent;
    }

    /**
     * Returns vendor-specific form fields to display in the pushnotification modal
     * @param {string} vendor - The vendor name ('buyandread', 'forte', 'subrite')
     * @returns {Array} Array of field objects with properties:
     *   - id: string - HTML element ID
     *   - label: string - Display label for the field
     *   - type: string - Input type ('text', 'checkbox')
     *   - checked: boolean - Default checked state (for checkboxes)
     *   - placeholder: string - Optional placeholder text for input fields
     */
    getVendorFields(vendor) {
        const fields = {
            buyandread: [
                {
                    id: 'customUrl',
                    label: 'Custom Article URL (Optional)',
                    type: 'text'
                },
                {
                    id: 'excludeParams',
                    label: 'Send notification without linking to article',
                    type: 'checkbox',
                    checked: this.config.excludeParamsDefault
                }
            ],
            forte: [
                {
                    id: 'forteLink',
                    label: 'Link (Optional)',
                    type: 'text',
                    placeholder: 'Enter URL to open specific screen on notification click'
                }
            ]
        };
        return fields[vendor] || [];
    }

    /**
     * Creates and returns the topics selection field for Forte vendor
     * Uses the UIElement.getArraySelect method for a consistent selection interface.
     * If topics are configured in settings, shows buttons for selection.
     * Otherwise, shows a text input for manual entry.
     * @returns {Object} Object with element and getSelectedItems method
     */
    createTopicsField() {
        const topics = this.config.topicString
            ? this.config.topicString.split(',').map((t) => t.trim()).filter((t) => t)
            : [];

        return this.api.v1.ui.element.getArraySelect({
            items: topics,
            selectedItems: [],
            id: 'forteTopicsContainer',
            buttonClass: 'forte-topic-btn',
            selectedClass: 'selected',
            placeholder: 'Enter topics (comma-separated)',
            label: 'Select Topics',
            useTextInputFallback: true,
            returnObject: true
        });
    }

    /**
     * Displays the push notification modal dialog
     * Pre-fills title and body from current article data
     * Includes vendor-specific fields based on configuration
     */
    showPushModal() {
        const pageData = this.getPageData();
        const titleText = this.stripHtmlTags(pageData.title || '');
        const subtitleText = this.stripHtmlTags(pageData.subtitle || '');
        const { vendor } = this.config;

        const bodyLabel = vendor === 'buyandread' ? 'Message' : 'Body';

        // Build array of form group items
        let modalContentItems = `
            <div class="lab-formgroup-item">
                <label for="pushTitle">Title</label>
                <input type="text" id="pushTitle" class="lab-input" value="${ this.config.defaultTitle || titleText || '' }">
            </div>
            <div class="lab-formgroup-item">
                <label for="pushBody">${ bodyLabel }</label>
                <textarea id="pushBody" class="lab-input">${ this.config.defaultMessage || subtitleText || '' }</textarea>
            </div>`;

        // Add vendor-specific fields
        this.getVendorFields(vendor).forEach((field) => {
            if (field.type === 'checkbox') {
                modalContentItems += `
            <div class="lab-formgroup-item">
                <label for="${ field.id }">${ field.label }</label>
                <input type="checkbox" id="${ field.id }" ${ field.checked ? 'checked' : '' }>
            </div>`;
            } else {
                const placeholderAttr = field.placeholder ? `placeholder="${ field.placeholder }"` : '';
                modalContentItems += `
            <div class="lab-formgroup-item">
                <label for="${ field.id }">${ field.label }</label>
                <input type="text" id="${ field.id }" class="lab-input" value="" ${ placeholderAttr }>
            </div>`;
            }
        });

        // Add placeholder for topics field for forte (will be inserted after modal renders)
        if (vendor === 'forte') {
            modalContentItems += `<div id="forteTopicsFieldContainer"></div>`;
            if (pageData && pageData.lab_pushNotificationSent && pageData.lab_pushNotificationSent !== '') {
                // Add status info if push notification is registered
                const { lab_pushNotificationSent } = pageData;
                const lab_pushNotificationSent_date = new Date(lab_pushNotificationSent * 1000);
                const formattedTimestamp = lab_pushNotificationSent_date.toLocaleString();
                modalContentItems += `
            <div class="lab-formgroup-item">
                <p><em>Push notification sent: ${ formattedTimestamp }</em></p>
            </div>`;
            }
        }

        this.api.v1.ui.modal.dialog({
            content: {
                title: `Send ${ vendor.charAt(0).toUpperCase() + vendor.slice(1) } Push Notification`,
                description: `<div class="lab-formgroup">${ modalContentItems }</div>`
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
                    const title = document.getElementById('pushTitle').value.trim();
                    const body = document.getElementById('pushBody').value.trim();
                    const options = this.collectFormOptions(vendor);

                    // Validate data only for Forte, Link is optional
                    if (vendor === 'forte') {
                        const errors = [];

                        if (!title) {
                            errors.push('Title');
                        }

                        if (!body) {
                            errors.push('Body');
                        }

                        if (!options.topics || options.topics.length === 0) {
                            errors.push('At least one topic');
                        }

                        // If there are validation errors, show them all
                        if (errors.length > 0) {
                            const errorMessage = `The following fields are required:<br><br>${ errors.map((e) => `- ${ e }`).join('<br>') }`;
                            this.showResultModal('Validation Error', errorMessage, true);
                            return false;
                        }
                    }

                    this.publish(title, body, options);
                    return true;
                }
            }
        });

        // After modal is rendered, insert the topics field using getArraySelect
        if (vendor === 'forte') {
            const container = document.getElementById('forteTopicsFieldContainer');
            if (container) {
                this.topicsField = this.createTopicsField();
                container.appendChild(this.topicsField.element);
            }
        }
    }

    /**
     * Collects form input values specific to each vendor from the modal
     * @param {string} vendor - The vendor name ('buyandread', 'forte', 'subrite')
     * @returns {Object} Object containing vendor-specific options:
     *   BuyAndRead: { customUrl: string, excludeParams: boolean }
     *   Forte: { topics: string[], link: string }
     *   Subrite: {} (no additional options)
     */
    collectFormOptions(vendor) {
        const options = {};

        if (vendor === 'buyandread') {
            const customUrlEl = document.getElementById('customUrl');
            const excludeParamsEl = document.getElementById('excludeParams');
            if (customUrlEl) options.customUrl = customUrlEl.value;
            if (excludeParamsEl) options.excludeParams = excludeParamsEl.checked;
        }

        if (vendor === 'forte') {
            // Use the getArraySelect method's getSelectedItems function
            if (this.topicsField) {
                options.topics = this.topicsField.getSelectedItems();
            }

            const forteLinkEl = document.getElementById('forteLink');
            if (forteLinkEl && forteLinkEl.value) {
                options.link = forteLinkEl.value;
            }
        }

        return options;
    }

    /**
     * Retrieves data from the currently edited article/page
     * @returns {Object} Page data object containing:
     *   - type: string - Content type
     *   - id: string - Content ID
     *   - tags: Array - Associated tags
     *   - section: string - Primary section tag
     *   - title: string - Article title
     *   - subtitle: string - Article subtitle
     *   - url: string - Full published URL
     *   - status: string - Publication status
     *   - visibility_status: string - Visibility status
     *   - publishhidden: string - Whether published as hidden ('1' or '0')
     *   - site: Object - Site information with alias
     */
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
            lab_pushNotificationSent: root.get('fields.lab_pushNotificationSent'),
            publishhidden: root.get('fields.publishhidden'),
            site: {
                alias: site.alias
            }
        };
    }

    /**
     * Builds the API payload data structure for each vendor
     * @param {string} vendor - The vendor name
     * @param {string} customTitle - Notification title from modal
     * @param {string} customBody - Notification body from modal
     * @param {Object} options - Vendor-specific options from collectFormOptions()
     * @param {Object} pageData - Current page data from getPageData()
     * @returns {Object|null} Vendor-specific payload object, or null if not applicable
     */
    buildPayloadData(vendor, customTitle, customBody, options, pageData) {
        switch (vendor) {
            case 'subrite':
                return {
                    title: customTitle,
                    body: customBody,
                    data: {
                        url: pageData.url
                    },
                    topics: pageData.tags
                };

            case 'buyandread':
                return null; // buyandread uses URL params instead

            case 'forte':
                return {
                    topics: options.topics || [],
                    title: customTitle,
                    body: customBody,
                    link: options.link || ''
                };

            default:
                return null;
        }
    }

    /**
     * Builds the complete API request URL for each vendor
     * @param {string} vendor - The vendor name
     * @param {string} customTitle - Notification title
     * @param {string} customBody - Notification body
     * @param {Object} options - Vendor-specific options
     * @param {Object} pageData - Current page data
     * @returns {string} Complete API endpoint URL with query parameters
     * @throws {Error} If vendor is unknown or required config is missing
     */
    buildRequestUrl(vendor, customTitle, customBody, options, pageData) {
        switch (vendor) {
            case 'subrite':
                return 'https://api.subrite.no/api/v1/app-push/pushcontent';

            case 'buyandread': {
                const params = new URLSearchParams({
                    title: customTitle,
                    message: customBody
                });

                if (!options.excludeParams) {
                    const url = options.customUrl || pageData.url;
                    params.append('url', url);
                }

                return `https://www.buyandread.com/servlet/api/${ this.config.providerId }/provider/v1/app/sendPushMessage?${ params.toString() }`;
            }

            case 'forte':
                if (!this.config.baseUrl) {
                    throw new Error('Forte base URL not configured. Please add it in the admin settings.');
                }
                return `${ this.config.baseUrl }/notifications/send`;

            default:
                throw new Error(`Unknown vendor: ${ vendor }`);
        }
    }

    /**
     * Validates the API response from the vendor to determine success
     * @param {Object|null} responseData - Response data from the vendor API
     * @returns {boolean} true if notification was sent successfully, false otherwise
     *
     * Success indicators:
     * - Empty response (200 OK with no body)
     * - No explicit failure flags in response
     *
     * Failure indicators:
     * - success: false
     * - data.success: false
     * - status: 'failed' or 'error'
     */
    validateResponse(responseData) {
        // Empty response means 200 OK, which is success
        if (!responseData) return true;

        // Check for explicit failure indicators
        if (responseData.success === false) return false;
        if (responseData.data && responseData.data.success === false) return false;
        if (responseData.status === 'failed' || responseData.status === 'error') return false;

        // Otherwise treat as success
        return true;
    }

    /**
     * Main method to send the push notification
     * Validates page status, builds request, sends to backend proxy, and shows result
     *
     * @param {string} customTitle - Notification title
     * @param {string} customBody - Notification body/message
     * @param {Object} options - Vendor-specific options (default: {})
     *
     * Workflow:
     * 1. Validates page is published and visible
     * 2. Builds vendor-specific request URL and payload
     * 3. Sends request through backend
     * 4. Validates response and shows success/error modal
     */
    publish(customTitle, customBody, options = {}) {
        const pageData = this.getPageData();
        const { vendor } = this.config;

        if (pageData.visibility_status !== 'P' || pageData.publishhidden === '1') {
            this.showResultModal('Error', 'Page must be published and visible to send push notifications.', true);
            return;
        }

        let requestUrl;
        let data;

        try {
            requestUrl = this.buildRequestUrl(vendor, customTitle, customBody, options, pageData);
            data = this.buildPayloadData(vendor, customTitle, customBody, options, pageData);
        } catch (error) {
            this.showResultModal('Error', error.message, true);
            return;
        }

        const formData = new FormData();
        const payload = {
            site: pageData.site.alias,
            vendor,
            request_url: requestUrl
        };

        if (data) {
            payload.data = JSON.stringify(data);
        }

        formData.append('payload', JSON.stringify(payload));

        this.api.v1.util.httpClient.request(
            '/ajax/pushnotification/post',
            {
                method: 'POST',
                body: formData
            }
        ).then((responseData) => {
            const success = this.validateResponse(responseData);

            if (!success) {
                const errorMessage = `Contact us if the error persists.<br>
                <b>Status response:</b> ${ JSON.stringify(responseData) || 'Push notification failed' }`;
                return Promise.reject(new Error(errorMessage));
            }

            // Set timestamp on root model after successful push notification
            const timestamp = Math.floor(Date.now() / 1000);
            const root = this.api.v1.model.query.getRootModel();
            root.set('fields.lab_pushNotificationSent', timestamp);

            this.showResultModal('Success!', 'Push notification sent successfully!', false);
            return Promise.resolve(true);
        }).catch((error) => {
            const errorMessage = error.message ? `<br>\n\n${ error.message }` : '';
            this.showResultModal('Error - Push request failed!', errorMessage, true);
        });
    }

    /**
     * Displays a result modal with success or error state
     * @param {string} title - Modal title
     * @param {string} message - Modal message (can include HTML)
     * @param {boolean} isError - Whether this is an error (true) or success (false) modal
     */
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
