export class AddComment {

    constructor(api, menuItem) {
        this.api = api;
        this.menuItem = menuItem;
        this.model = menuItem.getModel();
        this.data = {
            id: null,
            fields: {},
            children: []
        };
        this.registered = false;
        this.saveInProgress = false;
        this.modal = null;
        this.display();
    }

    display() {
        this.modal = this.api.v1.ui.modal.dialog({
            defaultButtons: false,
            container: {
                width: 500
            },
            content: {
                header: 'Add comment',
                markup: this.getMarkup(this.data)
            },
            callbacks: {
                didDisplay: (modal) => {},
                submit: (formElements) => {
                    this.save(formElements);
                },
                end: () => {
                    if (this.endcallback && !this.saveInProgress) {
                        this.endcallback(this.data.id);
                    }
                }
            },
            eventHandlers: [{
                selector: '#cancel-btn',
                event: 'click',
                callback: (theModal, event) => {
                    theModal.close();
                }
            }],
            keyValidation: [{
                key: 'comment',
                validator: 'notEmpty'
            }],
            footer: {
                buttons: [
                    {
                        value: 'Cancel',
                        highlight: false,
                        id: 'cancel-btn'
                    },
                    {
                        value: 'Add comment',
                        type: 'submit',
                        highlight: true
                    }
                ]
            }
        });
    }

    save(formElements) {
        this.api.v1.collabrador.addComment(
            {
                from: 0,
                to: 0,
                text: formElements.comment || '',
                tagGuid: this.model.get('guid') || '',
                author: 'Test Testersen', // Not needed when we go to prod, will be handled by the token
                email: 'test@testersen.no' // Not needed when we go to prod, will be handled by the token
            }
        )
    }

    getMarkup(data) {
        return this.api.v1.util.dom.renderView('apps/addComment/editor', {}, false);
    }

    // Temp only
    generateRandomId(length = 8) {
        return Math.random().toString(36).substring(2, length + 2);
    }

}
