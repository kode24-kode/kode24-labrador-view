import { DateTimeHelper } from '../../lib/helpers/datetime/DateTimeHelper.js';

export class WoodwingExport {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.enabled = this.api.v1.user.hasPermission('export_woodwing');
        this.exportUrl = this.api.v1.config.get('woodwingUrl');
        this.dateTimeHelper = new DateTimeHelper(this.api.v1.config.get('lang'));
        this.dom = {
            exportDate: null,
            message: null
        };
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium lab-space-above-none">Export article to WoodWing</h2>
                <p class="lab-para lab-grid-large-12">Last exported: <strong data-name="export-date">--</strong></p>
            </div>
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <input type="button" value="Export article">
                </div>
            </div>
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <p class="lab-para lab-grid-large-12" id="messageArea"></p>
            </div>
        </div>`;
    }

    onAside() {
        return {
            section: 'Export',
            label: 'WoodWing'
        };
    }

    onPaths() {}

    onMarkup() {
        const markup = this.api.v1.util.dom.renderTemplate(this.template, {}, true);
        this.dom.exportDate = markup.querySelector('[data-name=export-date]');
        this.dom.messageArea = markup.querySelector('#messageArea');
        this.updateExportDate();
        const title = this.rootModel.get('fields.title');
        if (!title) {
            const submitButton = markup.querySelector('input[type=button]');
            submitButton.setAttribute('disabled', 'disabled');
            this.displayMessage('<i>Article title is required</i>');
        }
        if (!this.exportUrl) {
            const submitButton = markup.querySelector('input[type=button]');
            submitButton.setAttribute('disabled', 'disabled');
            this.displayMessage('<i>WoodWing URL is required</i>');
        }
        this.onSubmit(markup);
        return markup;
    }

    onSubmit(markup) {
        const submitButton = markup.querySelector('input[type=button]');
        submitButton.addEventListener('click', () => {
            markup.classList.add('lab-busy');
            submitButton.setAttribute('disabled', 'disabled');

            const ajaxUrl = `/ajax/article/get-export-json/?articleId=${ this.rootModel.get('id') }`;
            this.api.v1.util.httpClient.get(ajaxUrl)
                .then((response) => {
                    response.siteId = this.api.v1.site.getSite().id;
                    if (this.exportUrl) {
                        this.api.v1.util.httpClient.request(
                            this.exportUrl,
                            {
                                method: 'POST',
                                mode: 'cors',
                                credentials: 'omit',
                                body: JSON.stringify(response)
                            }
                        ).then(() => {
                            this.rootModel.set('fields.woodwingExported', Math.floor(Date.now() / 1000));
                            this.displayMessage(`Sent to Woodwing at ${ new Date() } by ${ this.api.v1.user.getUserName() }`);
                            this.updateExportDate();
                            markup.classList.remove('lab-busy');
                            submitButton.removeAttribute('disabled');
                        });
                    }
                })
                .catch((error) => {
                    this.displayMessage(`<span style="color: red">An error occurred: ${ error }</span>`);
                    markup.classList.remove('lab-busy');
                    submitButton.removeAttribute('disabled');
                });
        });
    }

    displayMessage(msg) {
        this.dom.messageArea.innerHTML = msg;
    }

    updateExportDate() {
        const lastExport = this.rootModel.get('fields.woodwingExported');
        let formattedDate = 'Never';
        if (lastExport) {
            formattedDate = this.dateTimeHelper.timestampToNiceDate(lastExport);
        }
        this.dom.exportDate.innerHTML = formattedDate;
    }

}
