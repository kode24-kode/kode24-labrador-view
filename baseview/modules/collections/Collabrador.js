/** FEATURE STILL IN DEVELOPMENT */

export default class {

    constructor(api) {
        this.api = api;
    }

    onCreated(uiInterface, options) {
        // Initialize on creation
        lab_api.v1.collabrador.init().catch(error => {
            console.error('Collabrador initialization failed:', error);
            return;
        });

        // Expose handler globally for console debugging
        window.collabradorHandler = this;
        this.websocket = lab_api.v1.collabrador.initWebSocket(this.onWebsocketMessage, uiInterface, options);
    }

    onWebsocketMessage(event, uiInterface, options) {
        uiInterface.getData();
    }

    onHeader(uiInterface) {
        const form = this.api.v1.util.dom.renderView('collections/collabrador/header', {}, true);

        return form;
    }

    async onGetData(uiInterface, options) {
        try {
            // Fetch comments
            const comments = await lab_api.v1.collabrador.getComments();

            // Store comments for template rendering
            uiInterface.setProperty('comments', comments);

            // Return a single dummy item to trigger onRendered
            // We'll replace it with our custom template
            return comments && comments.length ? [{
                type: 'collabrador-comments',
                contentdata: {}
            }] : [];
        } catch (error) {
            console.error('Failed to get comments data:', error);
            return [];
        }
    }

    onRendered(uiInterface) {
        // Get the stored comments
        console.log('Collabrador feature still in development!');
        const comments = uiInterface.getProperty('comments');

        if (!comments || !comments.length) {
            return;
        }

        // Get the container element
        const container = uiInterface.getMarkup().querySelector('.lab-collection-items');

        // Clear container
        container.innerHTML = '';

        // Render all comments at once using the template
        const commentsEl = this.api.v1.util.dom.renderView('collections/collabrador/comment', {
            comments
        }, true);

        // Extract all child nodes from the rendered element and append them
        const fragment = document.createDocumentFragment();
        while (commentsEl.firstChild) {
            fragment.prepend(commentsEl.firstChild);
        }
        container.appendChild(fragment);

        const commentElements = container.querySelectorAll('.comment');

        commentElements.forEach((comment) => {
            comment.addEventListener('mouseover', () => {
                const { guid } = comment.dataset;
                if (!guid) return;
                const model = this.api.v1.model.query.getModelByGuid(guid);
                if (!model) return;
                this.api.v1.model.highlight.default(model, { scroll: true, speed: 500, approximateScroll: true });
            })
        })

        // Add event listeners for all buttons
        const editBtns = container.querySelectorAll('.comment-btn-edit');
        const resolveBtns = container.querySelectorAll('.comment-btn-resolve');
        const saveBtns = container.querySelectorAll('.comment-btn-save');
        const cancelBtns = container.querySelectorAll('.comment-btn-cancel');
        const textElements = container.querySelectorAll('.comment-text');

        editBtns.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const comment = btn.closest('.comment').querySelector('.comment-text').innerText;
                const commentId = btn.getAttribute('data-id');
                this.handleEditComment(comment, btn.closest('.comment'), container, commentId);
            }, false);
        });

        resolveBtns.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const comment = btn.closest('.comment').querySelector('.comment-text').innerText;
                const commentId = btn.getAttribute('data-id');
                this.handleResolveComment(comment, btn.closest('.comment'), commentId);
            }, false);
        });

        saveBtns.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const comment = btn.closest('.comment').querySelector('.comment-text').innerText;
                const commentId = btn.getAttribute('data-id');
                this.handleSaveComment(comment, btn.closest('.comment'), commentId);
            }, false);
        });

        cancelBtns.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.handleCancelComment(btn.closest('.comment'));
            }, false);
        });

        textElements.forEach((element) => {
            element.addEventListener('click', () => {
                this.handleTextClick(element);
            }, false);
        });

    }

    handleEditComment(comment, element, container, commentId) {
        this.closeAllOpenEditMode(container);

        const textElement = element.querySelector('.comment-text');
        const cancelBtn = element.querySelector('.comment-btn-cancel');
        const editBtn = element.querySelector('.comment-btn-edit');
        const resolveBtn = element.querySelector('.comment-btn-resolve');
        const saveBtn = element.querySelector('.comment-btn-save');
        const textarea = document.createElement('textarea');

        textarea.classList.add('comment-textarea-edit');
        textarea.value = comment;
        element.insertBefore(textarea, textElement);
        element.classList.add('comment-edit-mode');
        textElement.classList.add('hidden');
        cancelBtn.classList.remove('hidden');
        editBtn.classList.add('hidden');
        resolveBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        textarea.focus();
    }

    handleResolveComment(comment, element, commentId) {
        const commentData = {
            id: commentId,
            resolved: true
        }
        // TODO: handle errors from Collabrador
        this.api.v1.collabrador.modifyComment(commentData);
        element.classList.add('comment-resolved');
        const cancelBtn = element.querySelector('.comment-btn-cancel');
        const editBtn = element.querySelector('.comment-btn-edit');
        const resolveBtn = element.querySelector('.comment-btn-resolve');
        const saveBtn = element.querySelector('.comment-btn-save');
        cancelBtn.classList.add('hidden');
        editBtn.classList.add('hidden');
        resolveBtn.classList.add('hidden');
        saveBtn.classList.add('hidden');
    }

    handleSaveComment(comment, element, commentId) {
        const textElement = element.querySelector('.comment-text');
        const textArea = element.querySelector('.comment-textarea-edit');
        const commentData = {
            id: commentId,
            text: textArea.value
        };
        this.api.v1.collabrador.modifyComment(commentData).then((response) => {
            textElement.innerText = textArea.value;
        }).catch((error) => {
            console.error("Error: ", error);
        });

        this.endEditMode(element);
    }

    handleCancelComment(element) {
        this.endEditMode(element);
    }

    handleTextClick(element) {
        element.classList.toggle('expanded');
    }

    closeAllOpenEditMode(container) {
        const openEditors = container.querySelectorAll('.comment-edit-mode');
        openEditors.forEach((element) => {
            this.endEditMode(element);
        });
    }

    endEditMode(element) {
        const textElement = element.querySelector('.comment-text');
        const cancelBtn = element.querySelector('.comment-btn-cancel');
        const editBtn = element.querySelector('.comment-btn-edit');
        const resolveBtn = element.querySelector('.comment-btn-resolve');
        const saveBtn = element.querySelector('.comment-btn-save');
        const textArea = element.querySelector('.comment-textarea-edit');

        element.classList.remove('comment-edit-mode');
        textElement.classList.remove('hidden');
        cancelBtn.classList.add('hidden');
        editBtn.classList.remove('hidden');
        resolveBtn.classList.remove('hidden');
        saveBtn.classList.add('hidden');
        textArea.remove();
    }

}
