export class NTBExport {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.enabled = this.api.v1.user.hasPermission('export_ntb');
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium lab-space-above-none">Export article to NTB</h2>
                <p class="lab-para lab-grid-large-12">Last exported: <strong data-name="export-date">--</strong></p>
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
            label: 'NTB'
        };
    }

    onPaths() {}

    onMarkup() {
        const markupObject = {
            fields: {
                name: this.rootModel.get('fields.name'),
                labId: this.rootModel.get('fields.id')
            }
        };
        const markup = this.api.v1.util.dom.renderTemplate(this.template, markupObject, true);
        const exportDate = markup.querySelector('[data-name="export-date"]');
        const lastExported = this.rootModel.get('fields.ntbNitfLastExported');
        if (lastExported) {
            exportDate.textContent = new Date(lastExported * 1000).toLocaleString();
        }
        this.setupSubmit(markup, exportDate);
        return markup;
    }

    setupSubmit(markup, exportDate) {
        const btn = markup.querySelector('input[type=button]');
        const messageArea = markup.querySelector('#messageArea');

        btn.addEventListener('click', (event) => {
            markup.classList.add('lab-busy');
            btn.setAttribute('disabled', 'disabled');
            messageArea.textContent = '';

            const id = this.rootModel.getId();
            fetch(`/api/v2/ntb-nitf-export/${ id }`, { method: 'PUT' })
                .then((response) => response.json().then((json) => ({ ok: response.ok, json })))
                .then(({ ok, json }) => {
                    if (ok) {
                        messageArea.textContent = `Exported as ${ json.filename }`;
                        exportDate.textContent = new Date(json.ntbNitfLastExported * 1000).toLocaleString();
                    } else {
                        const message = json?.error?.[0]?.message;
                        messageArea.textContent = message ? `Export failed: ${ message }` : 'Export failed.';
                    }
                })
                .catch(() => {
                    messageArea.textContent = 'Export failed.';
                })
                .finally(() => {
                    markup.classList.remove('lab-busy');
                    btn.removeAttribute('disabled');
                });
        });
    }

}
