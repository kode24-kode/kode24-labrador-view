export default class NoticeHeader {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
    }

    onRendered(model, view) {
        if (!this.isEditor) {
            return;
        }
        const tags = [...model.get('tags')];
        const container = view.getMarkup().querySelector('.tags');
        for (const tag of tags) {
            const el = container.querySelector(`[data-tag="${ tag }"]`);
            if (el) {
                this.setupTag(model, el, tag);
            }
        }
        const addBtn = document.createElement('span');
        addBtn.classList.add('labicon-pluss_slim', 'add-tag');
        addBtn.setAttribute('title', 'Add tag');
        container.appendChild(addBtn);
        addBtn.addEventListener('click', async(e) => {
            e.preventDefault();
            let modal = null;
            const tagsContainer = await this.api.v1.util.tags.ui({
                callbacks: {
                    change: (tagsList) => {
                        if (modal) {
                            // Backend sorts tags alphabetically.
                            // Do the same here to avoid confusion.
                            const sortedTags = tagsList.sort();
                            modal.getMarkup().querySelector('#hidden_tags_input').value = sortedTags.join(', ');
                        }
                    }
                },
                tags
            });
            modal = this.api.v1.ui.modal.dialog({
                container: {
                    width: 500
                },
                placeholders: [
                    {
                        selector: '#placeholder-tags',
                        element: tagsContainer
                    }
                ],
                content: {
                    title: 'Edit tags',
                    formgroups: [
                        {
                            elements: [
                                {
                                    label: 'Selected tags. Click a tag to remove. <br>Use input field below to add new tags.',
                                    inline: true,
                                    tag: 'input',
                                    attributes: [
                                        {
                                            name: 'type',
                                            value: 'hidden'
                                        },
                                        {
                                            name: 'name',
                                            value: 'tag'
                                        },
                                        {
                                            name: 'id',
                                            value: 'hidden_tags_input'
                                        },
                                        {
                                            name: 'value',
                                            value: tags.join(', ')
                                        }
                                    ]
                                },
                                {
                                    grid: 12,
                                    placeholder: 'placeholder-tags'
                                },
                                {
                                    // Create space below for tag suggestions
                                    grid: 12,
                                    tag: 'p',
                                    value: '<br><br><br><br><br>'
                                }
                            ]
                        }
                    ]
                },
                callbacks: {
                    didDisplay: (theModal) => {
                        theModal.getMarkup().querySelector('input[name="tag"]').focus();
                    },
                    submit: (formElements) => {
                        const allTags = formElements.tag.trim().toLowerCase().split(',').map((t) => t.trim())
                            .filter((t) => t.length > 0);
                        if (allTags.length) {
                            model.set('tags', allTags);
                        }
                    }
                },
                eventHandlers: [{
                    selector: '#tag-cancel',
                    event: 'click',
                    callback: (theModal, event) => {
                        theModal.close();
                    }
                }],
                keyValidation: [{
                    key: 'tag',
                    validator: 'notEmpty'
                }],
                footer: {
                    buttons: [
                        {
                            value: 'Cancel',
                            highlight: false,
                            id: 'tag-cancel'
                        },
                        {
                            value: 'Save tags',
                            type: 'submit',
                            highlight: true
                        }
                    ]
                }
            });
        });
    }

    setupTag(model, element, tag) {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Tag clicked: ', tag);
            model.set('tags', [...model.get('tags').filter((t) => t !== tag)]);
        });
    }

}
