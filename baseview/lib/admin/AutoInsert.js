export default class AutoInsert {

    constructor() {
        this.currentData = null;
        this.setupCollapseListeners();
    }

    // Method called by ConfigObjectEditor.
    // Return a method to use as a listener for data-modifications.
    getListener() {
        return this.dataModified.bind(this);
    }

    // Listen for collapse/expand events
    setupCollapseListeners() {
        // Use event delegation to catch clicks on collapsable item labels
        document.addEventListener('click', (e) => {
            // Check if clicked element is an h3 label inside a collapsable container
            if (e.target.tagName === 'H3') {
                const container = e.target.parentElement;

                if (container && container.classList.contains('item-collapsable')) {
                    // Wait for the toggle to complete
                    setTimeout(() => {
                        // Re-run visibility logic whether expanding or collapsing
                        if (this.currentData) {
                            this.processVisibility(this.currentData);
                        }
                    }, 200);
                }
            }
        });
    }

    processVisibility(data) {
        for (const pageType of Object.keys(data)) {
            // Handle array structure (e.g., autoInsert with article/front arrays)
            if (Array.isArray(data[pageType])) {
                for (const item of data[pageType]) {
                    const index = data[pageType].indexOf(item);
                    const container = document.querySelector(`.lab-item-container[data-path="${ pageType }.[${ index }]"]`);
                    const optionalElements = container ? container.querySelectorAll('[data-require],[data-require-placement]') : [];
                    for (const el of optionalElements) {
                        const requiredType = el.getAttribute('data-require') ? el.getAttribute('data-require').split('|') : [];
                        const requiredPlacement = el.getAttribute('data-require-placement') ? el.getAttribute('data-require-placement').split('|') : [];
                        let showByType = true;
                        let showByPlacement = true;
                        if (requiredType.length) {
                            showByType = requiredType.includes(item.type);
                        }
                        if (requiredPlacement.length) {
                            showByPlacement = item.placement && requiredPlacement.includes(item.placement.key);
                        }
                        if (showByType && showByPlacement) {
                            el.style.display = 'initial';
                        } else {
                            el.style.display = 'none';
                        }
                    }
                }
            }
            // Handle flat object structure (e.g., plugins with vendor field or other control fields)
            else if (typeof data[pageType] === 'object' && data[pageType] !== null) {
                const item = data[pageType];
                const container = document.querySelector(`.lab-item-container[data-path="${ pageType }"]`);

                if (container) {
                    const optionalElements = container.querySelectorAll('[data-require]');
                    const isCollapsed = container.classList.contains('item-collapsed');

                    for (const el of optionalElements) {
                        // If container is collapsed, remove inline styles to let CSS handle it
                        if (isCollapsed) {
                            el.style.display = '';
                        } else {
                            const requiredValues = el.getAttribute('data-require') ? el.getAttribute('data-require').split('|') : [];
                            let show = false;
                            if (requiredValues.length) {
                                // Check all fields in the item to see if any match the required values
                                for (const fieldValue of Object.values(item)) {
                                    if (fieldValue && requiredValues.includes(String(fieldValue))) {
                                        show = true;
                                        break;
                                    }
                                }
                            } else {
                                show = true;
                            }
                            if (show) {
                                el.style.display = 'initial';
                            } else {
                                el.style.display = 'none';
                            }
                        }
                    }
                }
            }
        }
    }

    // May be called frequently. Use a timeout.
    // Also need a timeout to let ConfigObjectEditor update GUI
    // Note: ConfigObjectEditor will do a redraw initially after this method is called ...
    // Delay hiding/showing optional elements until after the redraw.
    dataModified(data, modifiedPaths, site) {
        this.currentData = data;
        setTimeout(() => {
            this.processVisibility(data);
        }, 200);
    }

}
