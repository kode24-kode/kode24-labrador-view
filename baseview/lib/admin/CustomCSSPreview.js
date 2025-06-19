// CustomCSSPreview.js
// Used by admin-tool to preview a page using selected custom CSS

import FooterPreview from './FooterPreview.js';

export default class CustomCSSPreview extends FooterPreview {

    constructor(configObjectEditor) {
        super(configObjectEditor);
        this.currentSite = null;
        this.frontpagesPerSite = {};
        this.sites = lab_api.v1.site.getSites();
        this.sitesByAlias = {};
        for (const site of this.sites) {
            this.sitesByAlias[site.alias] = site;
        }
        [this.pageSelector, this.pageSelectorLabel] = this.createPageSelector();
        document.querySelector('#save .left .lab-site-container-top').appendChild(this.pageSelectorLabel);
        this.defaultConfig = lab_api.v1.config.getConfig('custom_css_variables') || {}; // Get config defined in JSON files in the view.
        this.previewFrame = this.createIframe();
        this.fetchFrontPages();
        const style = document.createElement('style');
        style.innerHTML = `
        .lab-footerpreview {
            margin-top: 30px;
            position: relative;
        }
        .lab-footerpreview:before,
        .lab-footerpreview:after {
            content: 'Preview';
            position: absolute;
            top: -24px;
            left: 0;
            color: gray;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.05rem;
        }
        .lab-footerpreview:after {
            content: "Max preview width: " attr(data-size) " px";
            left: auto;
            right: 0;
        }
        `;
        this.tool.gui.container.appendChild(style);
        window.addEventListener('resize', () => {
            this.updatePreviewWidth(this.previewFrame);
        });
    }

    updatePreviewWidth(previewFrame) {
        if (!previewFrame) {
            return;
        }
        previewFrame.parentElement.setAttribute('data-size', this.tool.gui.container.clientWidth);
    }

    createIframe() {
        const container = document.querySelector('.lab-footerpreview') || document.createElement('div');
        container.classList.add('lab-footerpreview');
        const previewFrame = document.createElement('iframe');
        container.appendChild(previewFrame);
        this.tool.gui.container.appendChild(container);
        previewFrame.addEventListener('load', (e) => {
            this.updatePreview();
        }, false);
        this.updatePreviewWidth(previewFrame);
        return previewFrame;
    }

    loadPreview() {
        this.previewFrame.remove();
        this.previewFrame = this.createIframe();
        this.previewFrame.setAttribute('src', '');
        if (!this.pageSelector.value) {
            // this.previewFrame.setAttribute('src', `about:blank`);
            setTimeout(() => {
                if (this.pageSelector.value) {
                    return;
                }
                this.displayMessage('No frontpage selected');
            }, 200);
            return;
        }
        this.displayMessage('Loading ...');
        const siteInfo = this.sitesByAlias[this.currentSite];
        this.previewFrame.setAttribute('src', `${ siteInfo.domain }/a/${ this.pageSelector.value }?fontpreview=${ window.origin }`);
    }

    displayMessage(message) {
        this.previewFrame.setAttribute('src', '');
        this.previewFrame.contentWindow.document.open();
        this.previewFrame.contentWindow.document.write(`<html lang="no">
        <head>
            <title>Layout preview</title>
        </head>
        <body>
        <section><h3 style="text-align:center; font-family: Helvetica; margin: 3rem; color: gray;">${ message }</h3></section>
        </body>
        </html>`);
        this.previewFrame.contentWindow.document.close();
    }

    updatePreview() {
        const url = this.previewFrame.getAttribute('src');
        if (!url) {
            return;
        }
        const data = {};
        const mergedConfig = lab_api.v1.util.object.merge({ ...this.defaultConfig }, { ...this.tool.data });
        for (const key of Object.keys(mergedConfig)) {
            for (const viewport of Object.keys(mergedConfig[key])) {
                if (!data[viewport]) {
                    data[viewport] = [];
                }
                data[viewport].push(`--${ key }: ${ (mergedConfig[key][viewport] || {}).value };`);
            }
        }
        const styleData = [
            `:root { ${ (data.no_viewport || []).join(' ') } }`,
            `:@media(max-width: 767px) { ${ (data.mobile || []).join(' ') } }`,
            `:@media(min-width: 767px) { ${ (data.desktop || []).join(' ') } }`
        ];

        // Post a message to the preview-window:
        // If url is still not loaded the postMessage-method will throw a DOMException (cross-origin).
        this.previewFrame.contentWindow.postMessage(styleData, '*');
    }

    createPageSelector() {
        const pageSelectLabel = document.createElement('label');
        pageSelectLabel.setAttribute('style', 'margin-left: 1rem;');
        pageSelectLabel.classList.add('pageSelect');
        pageSelectLabel.innerHTML = 'Preview';
        const pageSelect = document.createElement('select');
        pageSelect.addEventListener('change', (event) => {
            this.loadPreview();
        });
        pageSelectLabel.appendChild(pageSelect);
        return [pageSelect, pageSelectLabel];
    }

    fetchFrontPages() {
        fetch('/ajax/front/get-all')
            .then((response) => {
                if (!response.ok) {
                    throw Error(response.statusText);
                }
                return response.json();
            }).then((frontpages) => {
                for (const item of frontpages.data) {
                    if (!this.frontpagesPerSite[item.site_id]) {
                        this.frontpagesPerSite[item.site_id] = [];
                    }
                    this.frontpagesPerSite[item.site_id].push(item);
                }
                this.updateFrontpages();
            }).catch((err) => {
                console.warn(err);
            });
    }

    updateFrontpages() {
        if (!this.currentSite) {
            this.currentSite = this.sites[0].alias;
        }
        const siteId = (this.sitesByAlias[this.currentSite] || {}).id;
        const frontpages = this.frontpagesPerSite[siteId] || [];
        this.pageSelector.innerHTML = '';
        for (const frontpage of frontpages) {
            const option = document.createElement('option');
            option.value = frontpage.nodeid;
            option.innerHTML = frontpage.frontname;
            this.pageSelector.appendChild(option);
        }
        this.loadPreview();
    }

    // May be called frequently. Use a timeout.
    dataModified(data, modifiedPaths, site) {
        if (site !== this.currentSite) {
            this.currentSite = site;
            this.updateFrontpages();
        }
        this.queueModifiedData(data, site);
    }

    handleModifiedData(data, site) {
        this.updatePreview();
    }

}
