export default class AutoInsert {

    // Method called by ConfigObjectEditor.
    // Return a method to use as a listener for data-modifications.
    getListener() {
        return this.dataModified.bind(this);
    }

    // May be called frequently. Use a timeout.
    // Also need a timeout to let ConfigObjectEditor update GUI
    // Note: ConfigObjectEditor will do a redraw initially after this method is called ...
    // Delay hiding/showing optional elements until after the redraw.
    dataModified(data, modifiedPaths, site) {
        setTimeout(() => {
            for (const pageType of Object.keys(data)) {
                for (const item of data[pageType]) {
                    const index = data[pageType].indexOf(item);
                    const container = document.querySelector(`.lab-item-container[data-path="${ pageType }.[${ index }]"]`); // data-path="article.[0]"
                    const optionalElements = container ? container.querySelectorAll('[data-require]') : [];
                    for (const el of optionalElements) {
                        const requiredType = el.getAttribute('data-require');
                        if (item.type === requiredType) {
                            el.style.display = 'initial';
                        } else {
                            el.style.display = 'none';
                        }
                    }
                }
            }
        }, 200);
    }

}
