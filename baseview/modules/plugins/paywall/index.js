import PaywallManager from './PaywallManager.js';

export default {
    name: 'Paywall Preview',
    description: 'Display a preview of the paywall configuration',
    version: '1.0.1',
    predicate: (api) => !api.v1.config.get('paywall.provider'),
    entry: class {

        onReady(api) {
            this.api = api;
            this.rootModel = api.v1.model.query.getRootModel();
            this.api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/paywall/paywall.css');

            if (this.rootModel.getType() === 'page_article') {
                let currentManager = null;
                const labStatusArea = document.querySelector('.lab-status-area');
                const span = document.createElement('span');
                span.className = 'labicon-ad_content';
                labStatusArea.appendChild(span);
                const navContainer = document.querySelector('body > div.lab-collection-drawer.lab-content > nav > ul');
                const btn = document.createElement('li');
                btn.style.display = 'none';
                btn.setAttribute('data-collection', 'no-collection');
                btn.innerHTML = `
                <div class="lab-lbl paywall-btn"><span class="labicon-ad_content" style="margin-top: -2px; display: block;"></span></div>
                <div class="lab-desc paywall-btn">Paywall</div>
                `;
                const lbl = btn.querySelector('.lab-lbl');
                btn.addEventListener('click', (event) => {
                    if (currentManager) {
                        currentManager.end();
                        currentManager = null;
                        lbl.classList.remove('paywall-btn-active');
                    } else {
                        const manager = new PaywallManager(api, this.rootModel, () => {
                            currentManager = null;
                            lbl.classList.remove('paywall-btn-active');
                        });
                        manager.setup();
                        currentManager = manager;
                        lbl.classList.add('paywall-btn-active');
                    }
                });
                navContainer.appendChild(btn);

                const paywallState = this.rootModel.get('fields.paywall');
                if (paywallState) {
                    const paywallElements = btn.querySelectorAll('.paywall-btn');
                    paywallElements.forEach((el) => {
                        el.classList.add('paywall-collection-btn-visible');
                    });
                    span.classList.add('paywall-collection-btn-visible');
                    btn.style.display = '';
                }

                this.api.v1.model.bindings.bind(this.rootModel, 'fields.paywall', (model, path, value) => {
                    const paywallElements = btn.querySelectorAll('.paywall-btn');
                    if (value) {
                        paywallElements.forEach((el) => {
                            el.classList.add('paywall-collection-btn-visible');
                        });
                        span.classList.add('paywall-collection-btn-visible');
                        btn.style.display = '';
                    } else {
                        paywallElements.forEach((el) => {
                            el.classList.remove('paywall-collection-btn-visible');
                        });
                        span.classList.remove('paywall-collection-btn-visible');
                        btn.style.display = 'none';
                    }
                });
            }
        }

    }
};
