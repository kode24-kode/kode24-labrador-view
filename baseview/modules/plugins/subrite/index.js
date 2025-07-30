import Subrite from './subrite.js';

export default {
    name: 'Subrite',
    description: 'Push message to app using Subrite',
    version: '1.0.0',
    predicate: (api) => api.v1.config.get('plugins.subrite.active'),
    entry: class {

        onReady(api) {
            api.v1.util.dom.addFile('css', '/view-resources/baseview/modules/plugins/subrite/subrite-main.css');

            let subriteInstance = null;

            const btn = api.v1.util.dom.renderTemplate('<li class="lab-item lab-btn labicon-subrite" title="Subrite"></li>', {}, true);
            document.querySelector('#labrador-menu ul li.lab-menulist ul').appendChild(btn);
            btn.addEventListener('click', (event) => {
                const config = api.v1.config.get('plugins.subrite');

                if (!subriteInstance) {
                    subriteInstance = new Subrite();
                    subriteInstance.onReady(api, config);
                }
                subriteInstance.showPushModal();
            }, false);
        }

    }
};
