import { DateTimeHelper } from '../../lib/helpers/datetime/DateTimeHelper.js';

export class RoxenExport {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.enabled = this.api.v1.user.hasPermission('export_roxen');
        this.multiPublicationEnabled = this.api.v1.config.get('roxen.multiPublicationEnabled');
        this.dateTimeHelper = new DateTimeHelper(this.api.v1.config.get('lang') || undefined);
        this.dom = {
            exportDate: null,
            message: null
        };
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium lab-space-above-none">Export article to Roxen</h2>
                <p class="lab-para lab-grid-large-12">Last exported: <strong data-name="export-date">--</strong></p>
            </div>
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <label for="lab-roxen-publication">Select publication</label>
                    <select name="lab-roxen-publication-select" id="lab-roxen-publication-select" disabled></select>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <label for="publishedDate">Select print edition</label>
                    <input type="date" id="publishedDate" name="fields.published" value="">
                </div>
            </div>
            <div class="lab-formgroup lab-grid lab-space-above-none lab-align-right">
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <input type="button" value="Export article">
                </div>
            </div>
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <p class="lab-para lab-grid-large-12" id="messageArea"></p>
            </div>
        </div>`;
    }

    // SettingsFront: If section exist: add item to it, if not: create.
    onAside() {
        return {
            section: 'Export',
            label: 'Roxen'
        };
    }

    onPaths() {}

    onMarkup() {
        const markup = this.api.v1.util.dom.renderTemplate(this.template, {
            fields: {
                name: this.rootModel.get('fields.name'),
                hostpath: this.rootModel.get('fields.hostpath'),
                lab_canonical: this.rootModel.get('fields.lab_canonical'),
                defaultsection: this.rootModel.get('fields.defaultsection')
            }
        }, true);

        const selectContainer = markup.querySelector('#lab-roxen-publication-select').parentNode;
        const publication = this.rootModel.get('fields.print_publication');
        const url = `/ajax/integration-services/proxy/export/roxen/?action=list&site=${ this.api.v1.site.getSite().alias }`;

        this.api.v1.util.httpClient.get(url).then((payload) => {
            if (payload.error) { return; }
            if (Array.isArray(payload)) {
                selectContainer.innerHTML = '';

                if (this.multiPublicationEnabled) {
                    const options = payload.map((item) => ({
                        value: item.prefix,
                        text: item.title
                    }));

                    const selectedValues = [];
                    if (publication) {
                        options.forEach((option) => {
                            if (option.value === publication) {
                                selectedValues.push(option.value);
                            }
                        });
                    }

                    const multiSelect = this.api.v1.ui.element.getMultiSelect({
                        options,
                        selectedValues,
                        id: 'lab-roxen-publication-select',
                        name: 'lab-roxen-publication-select',
                        showSelectAll: true,
                        selectAllText: 'Select All',
                        visibleItems: 5,
                        labelElement: markup.querySelector('label[for="lab-roxen-publication"]'),
                        labelText: 'Select publication',
                        labelCountText: '($count selected)',
                        returnObject: true
                    });

                    // Append the multi-select element to the container
                    selectContainer.appendChild(multiSelect.element);

                    // Trigger initial onChange to set the count
                    const selectedOptions = multiSelect.getSelectedValues();
                    if (selectedOptions.length > 0) {
                        const label = markup.querySelector('label[for="lab-roxen-publication"]');
                        label.innerHTML = `Select publication <span class="lab-selection-count">(${ selectedOptions.length } selected)</span>`;
                    }
                } else {
                    // Create standard select for single selection
                    const select = document.createElement('select');
                    select.id = 'lab-roxen-publication-select';
                    select.name = 'lab-roxen-publication-select';

                    // Add options
                    payload.forEach((item) => {
                        const option = document.createElement('option');
                        option.value = item.prefix;
                        option.textContent = item.title;
                        option.selected = item.prefix === publication;
                        select.appendChild(option);
                    });

                    selectContainer.appendChild(select);
                }
            }
        }).catch((error) => {
            // Integration do not return anything if Roxen is not set up in config. Ignore.
        });

        this.dom.exportDate = markup.querySelector('[data-name=export-date]');
        this.dom.messageArea = markup.querySelector('#messageArea');
        this.updateExportDate();
        this.setupSubmit(markup);
        return markup;
    }

    cleanText(text) {
        // Remove soft hypens (\u00ad) from text:
        return text.replace(/\u00ad/g, '');
    }

    setupSubmit(markup) {
        const btn = markup.querySelector('input[type=button]');

        btn.addEventListener('click', (event) => {
            const editionDate = markup.querySelector('#publishedDate').value;
            this.displayMessage('');
            if (editionDate !== '') {

                markup.classList.add('lab-busy');
                btn.setAttribute('disabled', 'disabled');

                this.api.v1.util.httpClient.get(`/prototype/get-node-and-data?id=${ this.rootModel.getId() }`, { resetCache: true }).then((d) => {
                    const data = { ...d };
                    const site = this.api.v1.site.getSite();
                    const publication = `lab-${ site.id }`;
                    const publicationsSelect = markup.querySelector('#lab-roxen-publication-select');
                    const publicationFromSelect = publicationsSelect.value;
                    data.data.fields.print_publication = (publicationFromSelect || publication);
                    data.data.fields.print_edition_date = editionDate;
                    if (this.multiPublicationEnabled) {
                        data.publicationsArray = publicationsSelect.selectedOptions.length ? Array.from(publicationsSelect.selectedOptions).map((o) => o.value) : [];
                    }
                    data.data.fields.title = this.cleanText(data.data.fields.title || '');
                    data.data.fields.subtitle = this.cleanText(data.data.fields.subtitle || '');
                    data.data.fields.bodytext = this.cleanText(data.data.fields.bodytext || '');
                    const export_url = `/ajax/integration-services/proxy/export/roxen?imageBaseUrl=${ this.api.v1.properties.get('image_server') }&site=${ site.alias }`;
                    this.api.v1.util.httpClient.request(
                        export_url,
                        {
                            body: JSON.stringify(data),
                            method: 'POST'
                        }
                    ).then((resp) => {
                        if (Array.isArray(resp)) {
                            // Check if each item in the array has an object_id
                            const allValid = resp.every((item) => item && item.object_id);
                            const validItems = resp.filter((item) => item && item.object_id);

                            if (allValid && resp.length > 0) {
                                // All items had object_id
                                this.rootModel.set('fields.print_exported', Math.floor(Date.now() / 1000));
                                this.rootModel.set('fields.print_publication', (publicationFromSelect || publication));
                                this.rootModel.set('fields.print_edition_date', editionDate);
                                this.rootModel.set('fields.print_id', validItems.map((item) => item.object_id).join(','));
                                this.displayMessage(`The article was successfully exported to ${ validItems.length } publication(s) in Roxen`);
                                this.updateExportDate();
                            } else {
                                // Some items were missing object_id or array was empty
                                this.displayMessage('There was a problem sending the article');
                                console.log(resp);
                            }
                        } else if (resp && resp.object_id) {
                            // Handle single object response (original behavior)
                            this.rootModel.set('fields.print_exported', Math.floor(Date.now() / 1000));
                            this.rootModel.set('fields.print_publication', (publicationFromSelect || publication));
                            this.rootModel.set('fields.print_edition_date', editionDate);
                            this.rootModel.set('fields.print_id', resp.object_id);
                            this.displayMessage('The article was successfully exported to Roxen');
                            this.updateExportDate();
                        } else {
                            this.displayMessage('There was a problem sending the article');
                            console.log(resp);
                        }
                        markup.classList.remove('lab-busy');
                        btn.removeAttribute('disabled');
                    }).catch((e) => {
                        this.displayMessage('The export to Roxen failed. Try again. If you continue to see this message contact support@publishlab.com');
                        console.error('Error: ', e, e.status);
                        markup.classList.remove('lab-busy');
                        btn.removeAttribute('disabled');
                    });
                });
            }
        });
    }

    displayMessage(msg) {
        this.dom.messageArea.innerHTML = msg;
    }

    updateExportDate() {
        const lastExport = this.rootModel.get('fields.print_exported');
        let formattedDate = 'Never';
        if (lastExport) {
            formattedDate = this.dateTimeHelper.timestampToNiceDate(lastExport);
        }
        this.dom.exportDate.innerHTML = formattedDate;
    }

}
