export class AptomaExport {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.enabled = this.api.v1.user.hasPermission('export_aptoma') && this.api.v1.config.get('aptoma.enabled');
        this.customTopicSectionString = this.api.v1.config.get('aptoma.customTopicSectionString') || false;
        this.enableNewsPaperSelection = this.api.v1.config.get('aptoma.enableNewsPaperSelection') || false;
        this.printArticleTypes = this.api.v1.config.get('aptoma.printArticleTypes') || [];
        this.printAptomaNewsPapers = this.api.v1.config.get('aptoma.printAptomaNewsPapers') || [];
        this.enableNotes = this.api.v1.config.get('aptoma.enableNotes') || false;
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <h2 class="lab-title lab-grid-large-12 lab-space-below-medium lab-space-above-none">Export article to Aptoma</h2>
            </div>
            <div class="lab-formgroup lab-grid lab-space-above-none">
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <label for="lab_printArticleTypeId">Select article type</label>
                    <select name="fields.lab_printArticleTypeId" id="lab_printArticleTypeId">
                        <option value="">Select article type</option>
                        {{ #printArticleTypes }}
                            <option value="{{ value }}"{{ #selected }} selected{{ /selected }}>{{ name }}</option>
                        {{ /printArticleTypes }}
                    </select>
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <label for="lab_printEditionDateFormatted">Select print edition</label>
                    <input type="date" id="lab_printEditionDateFormatted" name="fields.lab_printEditionDateFormatted" value="{{ fields.lab_printEditionDateFormatted }}">
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                    <label for="lab_printPage">Select print page</label>
                    <input type="number" id="lab_printPage" name="fields.lab_printPage" value="{{ fields.lab_printPage }}">
                </div>
                {{ #customTopicSectionString }}
                    <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                        <label for="lab_printArticleTopicString">Topic</label>
                        <input type="text" id="lab_printArticleTopicString" name="fields.lab_printArticleTopicString" value="{{ fields.lab_printArticleTopicString }}">
                    </div>
                    <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                        <label for="lab_printArticleSectionString">Aptoma section (leave empty to use Labrador section)</label>
                        <input type="text" id="lab_printArticleSectionString" name="fields.lab_printArticleSectionString" value="{{ fields.lab_printArticleSectionString }}">
                    </div>
                {{ /customTopicSectionString }}
                {{ #enableNotes }} 
                    <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                        <label for="lab_printArticleNotes">Notes</label>
                        <input type="text" id="lab_printArticleNotes" name="fields.lab_printArticleNotes" value="{{ fields.lab_printArticleNotes }}">
                    </div>
                {{ /enableNotes }}
                {{ #enableNewsPaperSelection }}
                    <div class="lab-formgroup-item lab-grid-large-12 lab-space-below-medium">
                        <label for="lab_printAptomaNewsPapers_json">News papers</label>
                        <select id="lab_printAptomaNewsPapers_json">
                        {{ #printAptomaNewsPapers }} 
                                <option value="{{ value }}"{{ #selected }} selected{{ /selected }}>{{ name }}</option>
                        {{ /printAptomaNewsPapers }}
                        </select>
                        
                        <input type="hidden" id="testStorage" disabled=true value="{{ fields.lab_printAptomaNewsPapers_json }}" />
                        <div class="selected-newspapers">
                            <p>Selected newspapers:</p>
                        </div>
                        
                        <input type="button" id="appendNewspaper" value="Add newspaper" class="lab-button lab-button-secondary lab-space-above-small">
                        <input type="button" id="deleteNewspaper" value="Remove newspaper" class="lab-button lab-button-secondary lab-space-above-small">
                    </div>
                {{ /enableNewsPaperSelection }}
            </div>
        </div>`;
    }

    // SettingsFront: If section exist: add item to it, if not: create.
    onAside() {
        return {
            section: 'Export',
            label: 'Aptoma'
        };
    }

    onPaths() {
        return {
            'fields.lab_printEditionDateFormatted': {
                node: 'fields.lab_printEditionDateFormatted',
                callback: (element) => {
                    this.rootModel.set('fields.lab_printEditionDate', element.valueAsNumber);
                }
            },
            'fields.lab_printArticleTypeId': {
                node: 'fields.lab_printArticleTypeId',
                callback: (element) => {
                    if (element.value) {
                        this.rootModel.set('fields.lab_printArticleType', this.printArticleTypes.find((item) => item.id === parseInt(element.value, 10)).type);
                    } else {
                        this.rootModel.set('fields.lab_printArticleType', null);
                    }
                }
            },
            'fields.lab_printAptomaNewsPapers_json': {
                node: 'fields.lab_printAptomaNewsPapers_json',
                callback: (element) => {
                    if (element.value) {
                        this.rootModel.set('fields.lab_printAptomaNewsPapers_json', element.value);
                    }
                }
            },
            'fields.lab_printPage': { node: 'fields.lab_printPage' },
            'fields.lab_printArticleTopicString': { node: 'fields.lab_printArticleTopicString' },
            'fields.lab_printArticleSectionString': { node: 'fields.lab_printArticleSectionString' },
            'fields.lab_printArticleNotes': { node: 'fields.lab_printArticleNotes' }
        };
    }

    onMarkup() {
        const currentPrintArticleType = parseInt(this.rootModel.get('fields.lab_printArticleTypeId'), 10);
        const printArticleTypes = (this.printArticleTypes || []).map((item) => ({ name: item.type, value: item.id, selected: item.id === currentPrintArticleType }));
        
        // Get the array
        const printAptomaNewsPapers = (this.printAptomaNewsPapers || []).map((item) => ({ name: item.type, value: item.id }));
        const markupObject = {
            printArticleTypes,
            fields: {
                lab_printArticleTypeId: this.rootModel.get('fields.lab_printArticleTypeId'),
                lab_printArticleType: this.rootModel.get('fields.lab_printArticleType'),
                lab_printEditionDate: this.rootModel.get('fields.lab_printEditionDate'),
                lab_printEditionDateFormatted: this.rootModel.get('fields.lab_printEditionDateFormatted'),
                lab_printPage: this.rootModel.get('fields.lab_printPage'),
            },
            customTopicSectionString: this.customTopicSectionString,
            enableNewsPaperSelection: this.enableNewsPaperSelection,
            enableNotes: this.enableNotes,
            printAptomaNewsPapers
        }
        if (this.customTopicSectionString) {
            markupObject.fields.lab_printArticleTopicString = this.rootModel.get('fields.lab_printArticleTopicString');
            markupObject.fields.lab_printArticleSectionString = this.rootModel.get('fields.lab_printArticleSectionString');
        }
        if (this.enableNewsPaperSelection) {
            const lab_printAptomaNewsPapers_json = this.rootModel.get('fields.lab_printAptomaNewsPapers_json');
            markupObject.fields.lab_printAptomaNewsPapers_json = lab_printAptomaNewsPapers_json;
        }
        // lab_printArticleNotes: this.rootModel.get('fields.lab_printArticleNotes')
        if (this.enableNotes) {
            const lab_printArticleNotes = this.rootModel.get('fields.lab_printArticleNotes');
            markupObject.fields.lab_printArticleNotes = lab_printArticleNotes;
        }
        const markup = this.api.v1.util.dom.renderTemplate(this.template, markupObject, true);
        this.setupNewsPaperButton(markup);
        this.loadSelectedNewspapers(markup);
        return markup;
    }

    loadSelectedNewspapers(markup) {
        if (!this.enableNewsPaperSelection) {
            return;
        }
        const input = this.rootModel.get('fields.lab_printAptomaNewsPapers_json');
        if (!input) {
            return;
        }
        if (typeof input === 'string') {
            try {
                input = JSON.parse(input);
            } catch (e) {
                console.error('Failed to parse input:', e);
                input = [];
            }
        }

        if (!Array.isArray(input)) {
            console.error('Input is not an array:', input);
            return;
        }

        const select = markup.querySelector('#lab_printAptomaNewsPapers_json');
        const selectedNewspapers = markup.querySelector('.selected-newspapers');
        input.forEach((newspaper) => {
            // Check if the newspaper exists in the select options
            const option = Array.from(select.options).find(opt => opt.value === newspaper);
            if (option) {
                this.addSelectedNewspaper(markup, option.value);
            } else {
                console.warn(`Newspaper with value "${newspaper}" not found in select options.`);
            }
        });
    }

    setupNewsPaperButton(markup) {
        if (!this.enableNewsPaperSelection) {
            return;
        }

        const btn = markup.querySelector('#appendNewspaper');
        // Append the news paper ID to the input field
        // Send the value of the select to the input field
        // If the input field is empty, create a new array
        // If the input field is not empty, append the value to the array
        // If the value already exists, do not append it again
        // If the value does not exist, append it to the array
        btn.addEventListener('click', (event) => {
            let input = this.rootModel.get('fields.lab_printAptomaNewsPapers_json');
            if (!input) {
                input = [];
            }
            // if empty array, create a new array. Some weird bug
            if (Array.isArray(input) && input.length === 0) {
                input = [];
            }
            const select = markup.querySelector('#lab_printAptomaNewsPapers_json');
            const value = select.value;
            if (!value) {
                return;
            }
            // check if input is a string, if so, parse it
            if (!Array.isArray(input)) {
                try {
                    input = JSON.parse(input);
                } catch (e) {
                    console.error('Failed to parse input:', e);
                    input = [];
                }
            }
            if (input.includes(value)) {
                // If the value already exists, do not append it again
                return;
            }

            input.push(value);
            // Send the value to the rootModel
            this.rootModel.set('fields.lab_printAptomaNewsPapers_json', input);
            // Update the input field
            const inputField = markup.querySelector('#testStorage');
            inputField.value = input;
            // Update the selected newspapers
            this.addSelectedNewspaper(markup, select.options[select.selectedIndex].value);
        });

        const deleteBtn = markup.querySelector('#deleteNewspaper');
        deleteBtn.addEventListener('click', (event) => {
            const select = markup.querySelector('#lab_printAptomaNewsPapers_json');
            const value = select.value;
            if (!value) {
                return;
            }
            let input = this.rootModel.get('fields.lab_printAptomaNewsPapers_json');
            if (!input) {
                input = [];
            }
            // check if input is a string, if so, parse it
            if (!Array.isArray(input)) {
                try {
                    input = JSON.parse(input);
                } catch (e) {
                    console.error('Failed to parse input:', e);
                    input = [];
                }
            }
            // remove the value from the array
            input = input.filter((item) => item !== value);
            this.rootModel.set('fields.lab_printAptomaNewsPapers_json', input);
            // Update the input field
            const inputField = markup.querySelector('#testStorage');
            inputField.value = input;
            // Update the selected newspapers
            // Remove the span from the selected newspapers
            this.deleteSelectedNewspaper(markup, select.options[select.selectedIndex].value);
        });


    }

    addSelectedNewspaper(markup, newspaper) {
        const selectedNewspapers = markup.querySelector('.selected-newspapers');
        const newSpan = document.createElement('span');
        newSpan.classList.add('lab-label', 'lab-label-secondary');
        newSpan.textContent = newspaper;
        newSpan.addEventListener('click', (event) => {
            const select = markup.querySelector('#lab_printAptomaNewsPapers_json');
            // Set the value of the select to the text content of the span
            select.value = newSpan.textContent;
            const deleteBtn = markup.querySelector('#deleteNewspaper');
            // Focus the delete button
            deleteBtn.focus();
        });
        selectedNewspapers.appendChild(newSpan);
    }

    deleteSelectedNewspaper(markup, newspaper) {
        const selectedNewspapers = markup.querySelector('.selected-newspapers');
        const spans = selectedNewspapers.querySelectorAll('span');
        spans.forEach((span) => {
            if (span.textContent === newspaper) {
                selectedNewspapers.removeChild(span);
            }
        });
    }


}
