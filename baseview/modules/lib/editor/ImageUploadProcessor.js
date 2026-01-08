// Let user add caption, alt-text etc. on uploaded images.
// Todo: When supported: Add button to publish image to front-servers
// Captions can be edited by the app CaptionEditor:
// this.api.v1.apps.start('CaptionEditor', { id: 123456 });

import contentLanguages from '../helpers/ContentLanguages.js';

export class ImageUploadProcessor {

    constructor(api, callbacks = {}) {
        this.api = api;
        this.callbacks = {
            modified: callbacks.modified || null
        };
        this.lastEditId = null;
        this.selectedLanguage = this.api.v1.config.get('contentLanguage') || 'en';
        this.template = `<div class="lab-fileuploader" data-lab-content="1">
            <div class="lab-formgroup">
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid black; border-top: 1px solid black;">
                    <span class="labicon-info" style="display: inline-flex; align-items: center; justify-content: center; min-width: 60px; height: 60px; border: 2px solid #a10eff; border-radius: 50%; color: #a10eff; font-size: 28px; font-weight: bold;"></span>
                    <p class="lab-para" style="margin: 0;">
                        Labrador AI can help you to add captions and alt texts to your images. That makes them easier to search for later and gives you better SEO. Just click on the wand to get started.
                    </p>
                </div>
                <div style="padding: 12px;">
                    <label for="ai-language-selector" style="font-weight: bold; margin-right: 8px;">Metadata language:</label>
                    <select id="ai-language-selector" style="width: 65%; padding: 4px 8px;">
                        {{ #languages }}
                        <option value="{{ code }}"{{ #selected }} selected{{ /selected }}>{{ name }} - {{ code }}</option>
                        {{ /languages }}
                    </select>
                </div>
                <ul class="lab-list">
                    {{ #items }}
                    <li class="item-no-{{ id }} lab-space-above-large" style="border-bottom: 1px solid #000000;">
                        <div class="lab-grid">
                            <div class="lab-grid-large-4">
                                <img src="{{ imageServer }}/?imageId={{ id }}&width={{ width }}" style="max-height: 180px; max-width: 180px; margin: 0 auto; display: block;">
                            </div>
                            <div class="lab-grid-large-7 lab-space-below-small lab-space-left-large">
                                <p class="lab-para"><strong>Filename: </strong>{{ fileName }}</p>
                                <p class="lab-para"><strong>ID: </strong>{{ id }}</p>
                                <p class="lab-para"><strong>Caption: </strong><span data-caption-{{ id }}>{{{ caption }}}{{ ^caption }}<span class="lab-label">No caption</span>{{ /caption }}</span></p>
                                <p class="lab-para"><strong>Alt text: </strong><span data-altText-{{ id }}>{{{ altText }}}{{ ^altText }}<span class="lab-label">No alt text</span>{{ /altText }}</span></p>
                                <p class="lab-para"><strong>Tags: </strong><span data-tags-{{ id }} class="lab-tags">{{ #tags }}<span class="lab-label lab-tag" style="cursor: default;">{{ . }}</span>{{ /tags }}{{ ^tags }}<span class="lab-label">No tags</span>{{ /tags }}</span></p>
                                <p class="lab-para"><strong>Byline: </strong><span data-byline-{{ id }}>{{{ byline }}}{{ ^byline }}<span class="lab-label">No byline</span>{{ /byline }}</span></p>
                                <p class="lab-align-right">
                                    <button class="lab-item lab-btn lab-generate lab-is-clickable" data-id="{{ id }}" title="Regenerate AI metadata">
                                        <span class="lab-item">
                                            <span class="lab-item-label {{ ^caption }}labicon-magic_wand{{ /caption }}{{ #caption }}labicon-refresh{{ /caption }}"></span>
                                        </span>
                                    </button>
                                    <input type="button" value="Edit" data-id="{{ id }}">
                                </p>
                            </div>
                        </div>
                    </li>
                    {{ /items }}
                </ul>
            </div>
        </div>`;
        this.imageServer = this.api.v1.properties.get('image_server');
    }

    imagesUploaded(items) {
        let isDisplayed = false;
        this.modal = this.api.v1.ui.modal.dialog({
            content: {
                header: 'Uploaded images',
                markup: this.getMarkup(items)
            },
            footer: {
                buttons: [
                    {
                        value: 'Media Library',
                        type: 'button',
                        id: 'media-library'
                    },
                    {
                        value: 'OK',
                        type: 'submit',
                        highlight: true
                    }
                ]
            },
            callbacks: {
                didDisplay: (modal) => {
                    if (this.lastEditId) {
                        const item = modal.getMarkup().querySelector(`.item-no-${ this.lastEditId }`);
                        if (item && typeof item.scrollIntoViewIfNeeded === 'function') {
                            item.scrollIntoViewIfNeeded();
                        }
                        this.lastEditId = null;
                    }
                    if (isDisplayed) { return; }
                    // Add event listeners for Edit buttons
                    for (const btn of modal.getMarkup().querySelectorAll('ul input:not(.lab-btn-ai-regenerate)')) {
                        btn.addEventListener('click', (event) => {
                            this.editImage(event.target.getAttribute('data-id'));
                        }, false);
                    }
                    // Add event listeners for AI Regenerate buttons
                    for (const btn of modal.getMarkup().querySelectorAll('ul button.lab-generate')) {
                        btn.addEventListener('click', (event) => {
                            const imageId = event.currentTarget.getAttribute('data-id');
                            this.regenerateAIMetadata(imageId);
                        }, false);
                    }
                    const link = modal.getMarkup().querySelector('#media-library');
                    link.addEventListener('click', (event) => {
                        modal.close();
                        this.api.v1.collection.display({ name: 'MediaImages', options: { reload: true } });
                    }, false);
                    // Add event listener for language selector
                    const languageSelector = modal.getMarkup().querySelector('#ai-language-selector');
                    if (languageSelector) {
                        languageSelector.addEventListener('change', (event) => {
                            this.selectedLanguage = event.target.value || this.api.v1.config.get('contentLanguage') || 'en';
                        }, false);
                    }
                    isDisplayed = true;
                }
            }
        });
    }

    editImage(id) {
        // Start caption-editor and also update UI in modal with result.
        this.api.v1.apps.start('CaptionEditor', {
            id,
            callback: (fields) => {
                this.lastEditId = id;

                // Extract tags from nested structure for UI update
                const tagsToDisplay = fields.tags || null;

                for (const key of Object.keys(fields)) {
                    if (key === 'extra_metadata_json') {
                        // Handle fields in extra_metadata_json
                        if (fields[key].altText) {
                            const altTextEl = this.modal.markup.querySelector(`span[data-altText-${ id }]`);
                            if (altTextEl) {
                                altTextEl.innerHTML = fields[key].altText;
                            }
                        }

                        // Update tags
                        if (tagsToDisplay) {
                            const tagsEl = this.modal.markup.querySelector(`span[data-tags-${ id }]`);
                            if (tagsEl) {
                                tagsEl.innerHTML = this.formatTagsAsHTML(tagsToDisplay);
                            }
                        }

                        // Handle other direct properties
                        for (const subKey of Object.keys(fields[key])) {
                            if (subKey !== 'altText' && subKey !== 'aiMetadata') {
                                const el = this.modal.markup.querySelector(`span[data-${ subKey }-${ id }]`);
                                if (el) {
                                    el.innerHTML = fields[key][subKey];
                                }
                            }
                        }
                    } else {
                        const el = this.modal.markup.querySelector(`span[data-${ key }-${ id }]`);
                        if (el) { el.innerHTML = fields[key]; }
                    }
                }

                this.updateCollection('MediaImages', { id, fields });
            }
        });
    }

    // Get tags from nested structure at aiMetadata.{lang}.tags
    findTagsInObject(obj) {
        if (!obj) return null;

        const languageToUse = this.selectedLanguage || this.api.v1.config.get('contentLanguage') || 'en';
        return obj.aiMetadata?.[languageToUse]?.tags || null;
    }

    addLoadingWrapper(element) {
        if (!element) return;
        const wrapper = document.createElement('span');
        wrapper.className = 'lab-ai-text-generating';
        wrapper.style.cssText = 'position: relative; display: inline-block; min-width: 100px; min-height: 20px;';
        element.parentNode.insertBefore(wrapper, element);
        wrapper.appendChild(element);
    }

    removeLoadingWrapper(element) {
        if (!element) return;
        const wrapper = element.closest('.lab-ai-text-generating');
        if (wrapper) {
            wrapper.parentNode.insertBefore(element, wrapper);
            wrapper.remove();
        }
    }

    // Need formatting for tags when rendering after generation
    formatTagsAsHTML(tags) {
        if (!tags || tags.length === 0) {
            return '<span class="lab-label">No tags</span>';
        }

        const tagElements = tags.map((tag) => `<span class="lab-label lab-tag" style="cursor: default;">${ tag }</span>`).join('');
        return `<span class="lab-tags">${ tagElements }</span>`;
    }

    async regenerateAIMetadata(imageId) {
        const site = lab_api.v1.site.getSite();
        const defaultLanguage = lab_api.v1.config.get('contentLanguage') || 'en';
        const languageToUse = this.selectedLanguage || defaultLanguage;

        // Find the button and disable it during generation
        const button = this.modal.markup.querySelector(`button.lab-generate[data-id="${ imageId }"]`);
        if (button) {
            button.disabled = true;
        }

        // Add loading effects to caption, altText, tags, and image
        const captionEl = this.modal.markup.querySelector(`span[data-caption-${ imageId }]`);
        const altTextEl = this.modal.markup.querySelector(`span[data-altText-${ imageId }]`);
        const tagsEl = this.modal.markup.querySelector(`span[data-tags-${ imageId }]`);
        const imageContainer = this.modal.markup.querySelector(`.item-no-${ imageId }`);

        // Add loading class - for text elements, use a wrapper approach
        this.addLoadingWrapper(captionEl);
        this.addLoadingWrapper(altTextEl);
        this.addLoadingWrapper(tagsEl);

        // Add image loading effect with beating animation
        if (imageContainer) {
            imageContainer.classList.add('lab-ai-image-generating');
            const img = imageContainer.querySelector('img');
            if (img) {
                // Wrap image in a container for the overlay
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'lab-ai-image-container';
                img.parentNode.insertBefore(imgWrapper, img);
                imgWrapper.appendChild(img);

                // Add overlay
                const overlay = document.createElement('div');
                overlay.className = 'lab-ai-image-overlay';
                imgWrapper.appendChild(overlay);
            }
        }

        try {
            // Call the metadata generation endpoint
            const payload = {
                imageId,
                maxTags: 8,
                language: languageToUse,
                site: site.alias,
                includeContext: true,
                prompt: 'Make sure to generate caption and alt text that are different from the current context'
            };

            const plainBodyText = this.api.v1.bodytext.getText(this.api.v1.model.query.getModelByType('bodytext'));
            if (plainBodyText) {
                // Append the bodytext context to the prompt
                payload.prompt = `
                Act as an editorial team in a newspaper. Write a new image caption with a maximum 250 characters. 
                You will be provided with the original caption, an article and an image. 
                The new caption should only be a sentence that is closer related to the article than the original caption. 
                If the provided image is related to the article, the new caption should relate to the context in the image.
                For the alt text: Ensure it provides context for accessibility, based solely on the image, and not the context.
                ARTICLE CONTEXT:
                "${ plainBodyText }"

                Make sure to generate caption and alt text that are different from the current caption and alt text.

                The Caption should be formatted as such with the keyword in all capital letters: <KEYWORD>: <caption text>
                `.trim();
            }

            const formData = new FormData();
            formData.append('payload', JSON.stringify(payload));

            const response = await lab_api.v1.util.httpClient.request(
                '/ajax/image-metadata-ai/generate-image-data',
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (response && response.metadata) {
                const caption = response.metadata.caption || '';
                const altText = response.metadata.alt_text || '';
                const tags = response.tags || [];

                // Save the metadata to backend
                const fields = {
                    caption,
                    extra_metadata_json: {
                        altText
                    }
                };

                const nodeData = {
                    type: 'image',
                    id: imageId,
                    fields
                };

                const saveFormData = new FormData();
                saveFormData.append('json[id]', imageId);
                saveFormData.append('json[type]', 'image');
                saveFormData.append('json[structure]', null);
                saveFormData.append('json[node]', JSON.stringify([nodeData]));

                await lab_api.v1.util.httpClient.request('/ajax/node/save-node-and-data', {
                    body: saveFormData,
                    method: 'POST'
                });

                // Remove loading effects
                this.removeLoadingWrapper(captionEl);
                this.removeLoadingWrapper(altTextEl);
                this.removeLoadingWrapper(tagsEl);
                if (imageContainer) {
                    imageContainer.classList.remove('lab-ai-image-generating');
                    const imgWrapper = imageContainer.querySelector('.lab-ai-image-container');
                    if (imgWrapper) {
                        const img = imgWrapper.querySelector('img');
                        const overlay = imgWrapper.querySelector('.lab-ai-image-overlay');
                        if (img) {
                            imgWrapper.parentNode.insertBefore(img, imgWrapper);
                        }
                        if (overlay) overlay.remove();
                        imgWrapper.remove();
                    }
                }

                // Update the modal UI with new content
                if (captionEl) {
                    captionEl.innerHTML = caption || '<span class="lab-label">No caption</span>';
                }
                if (altTextEl) {
                    altTextEl.innerHTML = altText || '<span class="lab-label">No alt text</span>';
                }
                if (tagsEl) {
                    tagsEl.innerHTML = this.formatTagsAsHTML(tags);
                }

                // Update button icon based on whether we now have content
                if (button && caption) {
                    const iconSpan = button.querySelector('.lab-item-label');
                    if (iconSpan) {
                        iconSpan.className = 'lab-item-label labicon-refresh';
                    }
                    button.setAttribute('title', 'Regenerate AI metadata');
                }

                // Update collection
                this.updateCollection('MediaImages', {
                    id: imageId,
                    fields: {
                        caption,
                        extra_metadata_json: { altText }
                    }
                });

                // Show success feedback
                if (button) {
                    button.classList.add('lab-success');
                    setTimeout(() => {
                        button.classList.remove('lab-success');
                        button.disabled = false;
                    }, 2000);
                }
            }
        } catch (error) {
            Sys.logger.error('[ImageUploadProcessor] Failed to regenerate AI metadata:', error);

            // Remove loading effects on error
            this.removeLoadingWrapper(captionEl);
            this.removeLoadingWrapper(altTextEl);
            this.removeLoadingWrapper(tagsEl);
            if (imageContainer) {
                imageContainer.classList.remove('lab-ai-image-generating');
                const imgWrapper = imageContainer.querySelector('.lab-ai-image-container');
                if (imgWrapper) {
                    const img = imgWrapper.querySelector('img');
                    const overlay = imgWrapper.querySelector('.lab-ai-image-overlay');
                    if (img) {
                        imgWrapper.parentNode.insertBefore(img, imgWrapper);
                    }
                    if (overlay) overlay.remove();
                    imgWrapper.remove();
                }
            }

            // Show error feedback
            if (button) {
                button.classList.add('lab-error');
                setTimeout(() => {
                    button.classList.remove('lab-error');
                    button.disabled = false;
                }, 2000);
            }
        }
    }

    // Update caption/byline in collection
    updateCollection(name, data) {
        const uiInterface = lab_api.v1.collection.get(name);
        if (uiInterface) {
            const contentList = uiInterface.getContentList();
            for (const item of contentList) {
                // eslint-disable-next-line eqeqeq
                if (item.model.get('instance_of') == data.id) {
                    for (const field of Object.keys(data.fields)) {
                        const key = field === 'caption' ? 'imageCaption' : field;
                        item.model.set(`fields.${ key }`, data.fields[field], {
                            notify: false, registerModified: false, save: false, undoable: false
                        });
                    }
                }
            }
        }
    }

    getMarkup(items) {
        // Process items to extract tags from nested structure
        const processedItems = items.map((item) => {
            const processedItem = { ...item };

            // Look for tags
            if (processedItem.extra_metadata_json) {
                const foundTags = this.findTagsInObject(processedItem.extra_metadata_json);
                if (foundTags) {
                    processedItem.tags = foundTags;
                }
            }

            // Also check altText
            if (!processedItem.altText && processedItem.extra_metadata_json) {
                if (processedItem.extra_metadata_json.altText) {
                    processedItem.altText = processedItem.extra_metadata_json.altText;
                }
            }

            return processedItem;
        });

        // Prepare languages for dropdown
        const languages = contentLanguages.map((language) => ({
            name: language.name,
            code: language.code,
            selected: language.code === this.selectedLanguage
        }));

        return this.api.v1.util.dom.renderTemplate(this.template, {
            items: processedItems,
            imageServer: this.imageServer,
            width: 180,
            languages
        });
    }

}
