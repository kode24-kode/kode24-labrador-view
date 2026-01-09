export default class {

    constructor(api) {
        this.api = api;
    }

    onHeader(uiInterface, params) {
        const form = this.api.v1.util.dom.renderView('collections/newComment/header', {}, true);
        form.querySelector('#add-comment').addEventListener('click', (event) => {
            event.preventDefault();
            this.api.v1.collabrador.addComment(
                {
                    from: 0,
                    to: 0,
                    text: form.querySelector('#new-comment').value,
                    tagGuid: this.api.v1.model.query.getRootModel().data.guid || '', // Will be the guid of the element but for collection the Guid of the article itself
                    author: 'Test Testersen', // Not needed when we go to prod, will be handled by the token
                    email: 'test@testersen.no' // Not needed when we go to prod, will be handled by the token
                }
            );
            form.querySelector('#new-comment').value = '';
        });
        form.querySelector('#cancel-comment').addEventListener('click', (event) => {
            event.preventDefault();
            form.querySelector('#new-comment').value = '';
        });
        return form;
    }

    onGetData(uiInterface, options) {
        return [
            {
                type: 'collabrador-comments',
                contentdata: {}
            }
        ];
    }

    onRendered(uiInterface) {
        // Get the container element
        const container = uiInterface.getMarkup().querySelector('.lab-collection-items');

        // Clear container
        if (container) container.remove();
    }

}
