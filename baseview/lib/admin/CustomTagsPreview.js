export default class CustomTagsPreview {

    constructor() {
        this.dataTimeout = null;
        this.elements = [];
        this.collapsedStates = new Map();
    }

    // Method called by ConfigObjectEditor.
    // Return a method to use as a listener for data-modifications.
    getListener() {
        return this.dataModified.bind(this);
    }

    // May be called frequently. Use a timeout.
    // Also need a timeout to let ConfigObjectEditor update GUI
    dataModified(data, modifiedPaths, site) {
        clearTimeout(this.dataTimeout);
        this.dataTimeout = setTimeout(() => {
            this.handleModifiedData(data, modifiedPaths, site);
        }, 200);
    }

    handleModifiedData(data, modifiedPaths, site) {
        while (this.elements.length) {
            this.elements.pop().remove();
        }
        for (const item of data) {
            const index = data.indexOf(item);
            const container = document.querySelector(`.lab-item-container[data-path="[${ index }]"]`);
            if (container) {
                const element = this.createCustomTagPreview(item);
                this.elements.push(element);
                container.appendChild(element);
            }
        }
    }

    createCustomTagPreview(item) {
        const el = document.createElement('div');
        el.classList.add('metadata-preview');

        // Create label element that changes based on state
        const labelEl = document.createElement('div');
        labelEl.classList.add('metadata-preview-label', 'collapsed');
        labelEl.innerText = 'Click here to review custom tag';

        // Create content element that will be collapsed/expanded
        const contentEl = document.createElement('div');
        contentEl.classList.add('metadata-preview-content', 'collapsed');
        // Use same method as ViewSupport to create the tag:
        contentEl.innerText = ViewSupport.CustomTags.createCustomTag(item);

        // Track collapsed state (default: collapsed)
        const previewId = `preview-${Math.random().toString(36).substr(2, 9)}`;
        this.collapsedStates.set(previewId, true);

        // Add click handler to toggle collapse/expand
        el.addEventListener('click', () => {
            const isCollapsed = this.collapsedStates.get(previewId);
            this.collapsedStates.set(previewId, !isCollapsed);

            if (isCollapsed) {
                // Expanding
                contentEl.classList.remove('collapsed');
                labelEl.classList.remove('collapsed');
                labelEl.classList.add('expanded');
                labelEl.innerText = 'Preview';
            } else {
                // Collapsing
                contentEl.classList.add('collapsed');
                labelEl.classList.remove('expanded');
                labelEl.classList.add('collapsed');
                labelEl.innerText = 'Click here to review custom tag';
            }
        });

        el.appendChild(labelEl);
        el.appendChild(contentEl);
        return el;
    }

}
