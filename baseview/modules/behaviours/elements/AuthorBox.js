export default class AuthorBox {

    constructor(api) {
        this.api = api;
        this.rootModel = this.api.v1.model.query.getRootModel();
        this.isEditor = this.api.v1.app.mode.isEditor();
    }

    // Running onReady to set image, as we need to ensure the image is properly set as early as possible during rendering
    onReady(model, view) {

        if (!this.isEditor) {
            // Get Author data
            const authordata = this.rootModel.get('fields.author_json');
            // Get children of type 'image' from our authorBox model (Placeholder in the Editor)
            const imageChildren = this.api.v1.model.query.getChildrenOfType(model, 'image');

            // Get imageurl in the authordata.children image
            if (authordata && authordata.children.image) {
                const image = authordata.children.image[0];

                // Get instance_of from imageurl
                let instanceOf = image.instance_of;

                if (!instanceOf && image.imageurl) {
                    const [, id] = image.imageurl.match(/imageId=(\d+)/) || [];

                    if (id) {
                        instanceOf = id;
                    }
                }

                // If we have an image child, set the instance_of and replace the placeholder
                if (imageChildren && imageChildren.length > 0) {
                    const imageChild = imageChildren[0];
                    imageChild.set('instance_of', instanceOf);
                    model.setFiltered('author_image', true);

                    // Get the image child's view to set viewport-specific crop data
                    const imageChildView = this.api.v1.view.getView(imageChild);
                    if (imageChildView) {
                        imageChildView.set('fields.croph', 0);
                        imageChildView.set('fields.cropw', 0);
                        imageChildView.set('fields.x', 0);
                        imageChildView.set('fields.y', 0);
                    }
                }
            } else {
                model.setFiltered('author_image', false);
            }
        }
    }

    onRender(model, view) {
        // Get authordata from front page node sent from backend
        const authordata = this.rootModel.get('fields.author_json');

        // Get authorbox fields, priority to authordata
        const getField = (field) => {
            // If editor is true, use model fields as fallback
            if (this.isEditor) {
                // Special handling for firstname/lastname
                if (field === 'firstname') {
                    return model.get('fields.origin_data_json.full_name')
                        || model.get('fields.full_name')
                        || '';
                }

                if (field === 'lastname') {
                    return '';
                }

                return model.get(`fields.origin_data_json.${ field }`)
                    || model.get(`fields.${ field }`)
                    || '';
            }

            // If editor is false, only use authordata if it exists and is not empty
            if (authordata && authordata.fields && authordata.fields[field]) {
                return authordata.fields[field];
            }

            // If not editor and authordata field is empty/missing, return empty string
            return '';
        };

        // Get all field values
        const firstname = getField('firstname');
        const lastname = getField('lastname');
        const full_name = [firstname, lastname].filter(Boolean).join(' ');
        const description = getField('description');
        const description2 = getField('description2');
        const public_phone = getField('public_phone');
        const public_url = getField('public_url');
        const public_email = getField('public_email');

        // Booleans to display or hide fields in the authorBox
        const hideDisplayName = model.get('fields.origin_data_json.hideDisplayName') || model.get('fields.hideDisplayName') || false;
        const hideDescription = model.get('fields.origin_data_json.hideDescription') || model.get('fields.hideDescription') || false;
        const hideExtendedDescription = model.get('fields.origin_data_json.hideExtendedDescription') || model.get('fields.hideExtendedDescription') || false;
        const hidePublicPhone = model.get('fields.origin_data_json.hidePublicPhone') || model.get('fields.hidePublicPhone') || false;
        const hidePublicUrl = model.get('fields.origin_data_json.hidePublicUrl') || model.get('fields.hidePublicUrl') || false;
        const hidePublicEmail = model.get('fields.origin_data_json.hidePublicEmail') || model.get('fields.hidePublicEmail') || false;

        // Show image in editor
        if (this.isEditor) {
            model.setFiltered('author_image', true);
        }

        // Set all the filtered data
        model.setFiltered('full_name', full_name);
        model.setFiltered('firstname', firstname);
        model.setFiltered('lastname', lastname);
        model.setFiltered('description', description);
        model.setFiltered('description2', description2);
        model.setFiltered('public_phone', public_phone);
        model.setFiltered('public_url', public_url);
        model.setFiltered('public_email', public_email);

        model.setFiltered('hideDisplayName', hideDisplayName);
        model.setFiltered('hideDescription', hideDescription);
        model.setFiltered('hideExtendedDescription', hideExtendedDescription);
        model.setFiltered('hidePublicPhone', hidePublicPhone);
        model.setFiltered('hidePublicUrl', hidePublicUrl);
        model.setFiltered('hidePublicEmail', hidePublicEmail);

        const imageChildren = this.api.v1.model.query.getChildrenOfType(model, 'image');

        if (imageChildren && imageChildren.length > 0) {
            const imageChild = imageChildren[0];
            const imageChildView = this.api.v1.view.getView(imageChild);
            if (imageChildView) {
                imageChildView.set('fields.croph', 0);
                imageChildView.set('fields.cropw', 0);
                imageChildView.set('fields.x', 0);
                imageChildView.set('fields.y', 0);
            }
        }

        // Desktop layout options (vertical, horizontal)
        const adminDesktopView = {
            layout: []
        };

        for (const orientation of ['vertical', 'horizontal']) {
            adminDesktopView.layout.push({
                name: orientation.charAt(0).toUpperCase() + orientation.slice(1),
                value: orientation,
                selected: orientation === view.get('fields.desktop_layout') || (!view.get('fields.desktop_layout') && orientation === 'vertical') // vertical default
            });
        }

        // Mobile layout options (vertical, horizontal)
        const adminMobileView = {
            layout: []
        };

        for (const orientation of ['vertical', 'horizontal']) {
            adminMobileView.layout.push({
                name: orientation.charAt(0).toUpperCase() + orientation.slice(1),
                value: orientation,
                selected: orientation === view.get('fields.mobile_layout') || (!view.get('fields.mobile_layout') && orientation === 'vertical') // vertical default
            });
        }

        // Set layout selections
        model.setFiltered('adminDesktopView', adminDesktopView);
        model.setFiltered('adminMobileView', adminMobileView);

        const desktopLayout = view.get('fields.desktop_layout') || 'vertical';
        const mobileLayout = view.get('fields.mobile_layout') || 'vertical';

        model.setFiltered('desktop_layout', desktopLayout);
        model.setFiltered('mobile_layout', mobileLayout);
    }

    onSettingsPanel() {
        return {
            onSubmit: ({ view, formValues }) => {
                for (const key of Object.keys(formValues)) {
                    let value = formValues[key];
                    if (key.startsWith('fields.hide')) {
                        value = !value;
                    }
                    view.set(key, value);
                }
            }
        };
    }

}
