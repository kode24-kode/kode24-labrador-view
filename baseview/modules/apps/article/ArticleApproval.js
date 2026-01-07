export class ArticleApproval {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.log = params.log;
        this.enabled = true;
        this.hasPermission = this.api.v1.user.hasPermission('admin_status');
        this.dom = {
            btnApprove: null,
            btnRevoke: null,
            timestamp: null
        };
        this.approvalSettings = {
            approval: {
                name: 'Approved for publishing',
                enable: true,
                approvedData: {},
                fieldName: 'lab_approved'
            },
            sentToDistribution: {
                name: 'Sent to distribution',
                enable: false,
                approvedData: {},
                fieldName: 'lab_sentToDistribution'

            },
            proofRead: {
                name: 'Proof read',
                enable: false,
                approvedData: {},
                fieldName: 'lab_proofRead'
            },
            typeset: {
                name: 'Typeset',
                enable: false,
                approvedData: {},
                fieldName: 'lab_typeset'
            }
        };
        this.getState();
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid">
                {{ #approval.enable }}
                <h2 class="lab-title lab-grid-large-12">{{ approval.name }}</h2>
                <div class="lab-formgroup-item lab-grid-large-12">
                    {{ #approval.description }}<p>{{ approval.description }}</p>{{ /approval.description }}
                    <p id="lbl-timestamp-approval">--</p>
                    <input type="button" id="btn-approve-approval" value="Approve">
                    <input type="button" id="btn-revoke-approval" value="Revoke">
                </div>
                {{ /approval.enable }}
                
                {{ #sentToDistribution.enable }}
                <h2 class="lab-title lab-grid-large-12 lab-space-above-large">{{ sentToDistribution.name }}</h2>
                <div class="lab-formgroup-item lab-grid-large-12">
                    {{ #sentToDistribution.description }}<p>{{ sentToDistribution.description }}</p>{{ /sentToDistribution.description }}
                    <p id="lbl-timestamp-sentToDistribution">--</p>
                    <input type="button" id="btn-approve-sentToDistribution" value="Approve">
                    <input type="button" id="btn-revoke-sentToDistribution" value="Revoke">
                </div>
                {{ /sentToDistribution.enable }}

                {{ #proofRead.enable }}
                <h2 class="lab-title lab-grid-large-12 lab-space-above-large">{{ proofRead.name }}</h2>
                <div class="lab-formgroup-item lab-grid-large-12">
                    {{ #proofRead.description }}<p>{{ proofRead.description }}</p>{{ /proofRead.description }}
                    <p id="lbl-timestamp-proofRead">--</p>
                    <input type="button" id="btn-approve-proofRead" value="Approve">
                    <input type="button" id="btn-revoke-proofRead" value="Revoke">
                </div>
                {{ /proofRead.enable }}

                {{ #typeset.enable }}
                <h2 class="lab-title lab-grid-large-12 lab-space-above-large">{{ typeset.name }}</h2>
                <div class="lab-formgroup-item lab-grid-large-12">
                    {{ #typeset.description }}<p>{{ typeset.description }}</p>{{ /typeset.description }}
                    <p id="lbl-timestamp-typeset">--</p>
                    <input type="button" id="btn-approve-typeset" value="Approve">
                    <input type="button" id="btn-revoke-typeset" value="Revoke">
                </div>
                {{ /typeset.enable }}

                {{ ^proofRead.enable }}
                {{ ^sentToDistribution.enable }}
                {{ ^typeset.enable}}
                <p><i>Go to <a href="/settings/cp?page=articleSettings">article settings in Admin</a> to enable extra approval statuses</i></p>
                {{ /typeset.enable}}
                {{ /sentToDistribution.enable }}
                {{ /proofRead.enable }}

            </div>
            <div class="lab-formgroup lab-grid" id="article-sharing-token-access">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-large">Article access link</h2>
                <div class="lab-formgroup-item lab-grid-large-12 sharing-link-container">
                    <p>Use this link to give access to the article without publishing it:</p>
                    <span id="article-sharing-link" style="line-break: anywhere;"><i class="lab-spinner"></i></span><br>
                    <input type="button" class="hidden" id="btn-copy-sharing-link" value="Copy link">
                    <span id="article-sharing-link-copied"></span>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 sharing-link-publish-first-container lab-hidden">
                    <p>Publish the article as "Hidden", to generate a link that can be accessed by others.</p>
                </div>
            </div>
        </div>`;
    }

    getArticleToken() {
        return new Promise((resolve, reject) => {
            const published_url = this.rootModel.get('fields.published_url');
            if (published_url === null) {
                this.dom.sharingLinkContainer.querySelector('.sharing-link-container').classList.add('lab-hidden');
                this.dom.sharingLinkContainer.querySelector('.sharing-link-publish-first-container').classList.remove('lab-hidden');
                resolve();
                return;
            }

            const url = `/ajax/article/create-article-token?articleId=${ this.rootModel.getId() }`;
            fetch(url, { mode: 'cors' })
                .then((response) => {
                    if (!response.ok) {
                        reject(response.statusText);
                    }
                    return response.json();
                }).then((json) => {
                    const sharing_url = `${ this.rootModel.get('fields.published_url') }?articleToken=${ json.token }`;
                    const domain = this.api.v1.site.getSite().domain || this.api.v1.properties.get('customer_front_url');
                    this.dom.sharingLink.innerHTML = `<a href="${ domain }${ sharing_url }" target="_blank" class="sharing-link">${ domain }${ sharing_url }</a>`;
                }).catch((err) => {
                    console.warn(err);
                    reject(err);
                });
        });
    }

    onAside() {
        return {
            section: 'Advanced',
            label: 'Article status'
        };
    }

    onPaths() {}

    approve(status) {
        this.api.v1.article.approval.approve(this.approvalSettings[status].fieldName).then(() => {
            this.getState();
            this.log({
                type: 'data',
                app: this.constructor.name,
                path: `fields.${ this.approvalSettings[status].fieldName }`,
                approved: '1'
            });
        });
    }

    revoke(status) {
        this.api.v1.article.approval.revoke(this.approvalSettings[status].fieldName).then(() => {
            this.getState();
            this.log({
                type: 'data',
                app: this.constructor.name,
                path: `fields.${ this.approvalSettings[status].fieldName }`,
                approved: '0'
            });
        });
    }

    onMarkup() {
        const markup = this.api.v1.util.dom.renderTemplate(this.template, this.approvalSettings, true);
        this.statuses = Object.keys(this.approvalSettings).filter((key) => this.approvalSettings[key].enable);

        for (const status of this.statuses) {
            this.dom[`btnApprove-${ status }`] = markup.querySelector(`#btn-approve-${ status }`);
            this.dom[`btnRevoke-${ status }`] = markup.querySelector(`#btn-revoke-${ status }`);
            this.dom[`timestamp-${ status }`] = markup.querySelector(`#lbl-timestamp-${ status }`);
        }

        for (const status of this.statuses) {
            this.dom[`btnApprove-${ status }`].disabled = this.approvalSettings[status].approvedData.isApproved;
            this.dom[`btnRevoke-${ status }`].disabled = !this.approvalSettings[status].approvedData.isApproved;
            this.dom[`timestamp-${ status }`].innerHTML = this.getTimestampLabel(status);
            this.dom[`btnApprove-${ status }`].addEventListener('click', (event) => {
                this.approve(status);
            }, false);
            this.dom[`btnRevoke-${ status }`].addEventListener('click', (event) => {
                this.revoke(status);
            }, false);

            if (!this.hasPermission) {
                this.dom[`btnApprove-${ status }`].setAttribute('disabled', 'disabled');
                this.dom[`btnRevoke-${ status }`].setAttribute('disabled', 'disabled');
            }

        }

        // Article sharing link with article token
        this.dom.sharingLinkContainer = markup.querySelector('#article-sharing-token-access');
        this.dom.sharingLink = markup.querySelector('#article-sharing-link');
        if (this.api.v1.properties.get('allow_publish_hidden_with_token') === '1') {
            this.getArticleToken();
        } else {
            this.dom.sharingLinkContainer.classList.add('lab-hidden');
        }
        this.dom.btnCopyLink = markup.querySelector('#btn-copy-sharing-link');
        this.dom.btnCopyLink.addEventListener('click', (event) => {
            navigator.clipboard.writeText(this.dom.sharingLink.querySelector('a').getAttribute('href'))
                .then(() => {
                    document.getElementById('article-sharing-link-copied').innerHTML = 'Copied!';
                });
        });

        return markup;
    }

    getState() {
        const siteInfo = this.api.v1.site.getSite();
        const siteApprovalSetup = this.api.v1.config.get('articleApprovalStatus', { site: siteInfo.alias });
        for (const key of Object.keys(this.approvalSettings)) {
            if (siteApprovalSetup && siteApprovalSetup[key]) {
                if ('enable' in siteApprovalSetup[key]) {
                    this.approvalSettings[key].enable = siteApprovalSetup[key].enable;
                } else {
                    this.approvalSettings[key].enable = false;
                }

                if ('name' in siteApprovalSetup[key] && typeof siteApprovalSetup[key].name === 'string' && siteApprovalSetup[key].name.length > 0) {
                    this.approvalSettings[key].name = siteApprovalSetup[key].name;
                }

                if ('description' in siteApprovalSetup[key] && typeof siteApprovalSetup[key].description === 'string' && siteApprovalSetup[key].description.length > 0) {
                    this.approvalSettings[key].description = siteApprovalSetup[key].description;
                }
            }
        }

        this.statuses = Object.keys(this.approvalSettings).filter((key) => this.approvalSettings[key].enable);

        for (const status of this.statuses) {
            const { fieldName } = this.approvalSettings[status];
            this.api.v1.article.approval.getData(fieldName).then((data) => {
                this.approvalSettings[status].approvedData = data;

                if (this.dom[`btnApprove-${ status }`]) {
                    this.dom[`btnApprove-${ status }`].disabled = this.approvalSettings[status].approvedData.isApproved;
                    this.dom[`btnRevoke-${ status }`].disabled = !this.approvalSettings[status].approvedData.isApproved;
                    this.dom[`timestamp-${ status }`].innerHTML = this.getTimestampLabel(status);
                }
            });
        }
    }

    getTimestampLabel(status) {
        let permissionInfo = '';
        if (!this.hasPermission) {
            permissionInfo = 'You do not have permission to accept/revoke this article.<br><br>';
        }
        if (!this.approvalSettings[status].approvedData.isApproved) {
            return `${ permissionInfo }Unapproved: '${ this.approvalSettings[status].name }'`;
        }
        const date = new Date(this.approvalSettings[status].approvedData.date.timestamp * 1000);
        return `${ permissionInfo }Approved: '${ this.approvalSettings[status].name }' approved by ${ this.approvalSettings[status].approvedData.user.name }<br>${ date.toISOString() }`;
    }

}
