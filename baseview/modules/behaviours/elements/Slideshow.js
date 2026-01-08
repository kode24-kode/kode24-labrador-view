export default class Slideshow {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
    }

    onRender(model, view) {
        // Set aspect ratio of images in the slideshow.
        // Prio: 1: data, 2: element-property, 3: config, 4: Hard-coded value
        const customAspectRatio = view.get('fields.aspectRatio') || view.getProperty('image.defaultAspectRatio') || this.api.v1.config.get('image.defaultAspectRatio') || 0.5;
        model.setFiltered('aspectRatio', customAspectRatio * 100);

        // Gallery mode: We need to render the index of each preview image for the url (/gallery/<page-id>/<slideshow-id>?photo=<index>):
        const imageList = [];
        let counter = 0;
        for (const child of model.getChildren()) {
            if (child.getType() === 'image' || child.getType() === 'placeholder_ad') {
                const childView = this.api.v1.view.getView(child, view.getViewport());
                const markup = childView.getMarkupString(); // Ensure the view is rendered to get any dynamic changes (e.g. lazy loading)
                imageList.push({
                    isImage: child.getType() === 'image',
                    url: child.get('filtered.imageCleanUrl'),
                    markup,
                    index: counter
                });
                if (child.getType() === 'image') {
                    counter++;
                }
            }
        }
        model.setFiltered('imageList', imageList);
        model.setFiltered('hasText', this.isEditor || (!!(model.get('fields.title') || model.get('fields.description'))));

    }

}
