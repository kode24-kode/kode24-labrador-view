export default class Grid {

    constructor(api) {
        this.api = api;
        this.sizes = {
            large: {
                columns: 3,
                rows: 4
            },
            small: {
                columns: 2,
                rows: 1
            }
        };
        this.smallElementTypes = ['article'];
        this.isEditor = this.api.v1.app.mode.isEditor();
        this.removedChildren = [];
    }

    onCreated(model) {
        if (model.getChildren().length) {
            return;
        }
        const size = this.getSize(model);
        for (let i = 0; i < size.columns * size.rows; i++) {
            this.createAndInsert(model);
        }
    }

    onInserted(model) {
        if (!this.isEditor) {
            return;
        }
        this.api.v1.model.bindings.bind(model, 'fields.columnCount', this.sizeUpdated.bind(this));
        this.api.v1.model.bindings.bind(model, 'fields.rowCount', this.sizeUpdated.bind(this));
        this.api.v1.model.bindings.bind(model, 'fields.columnCountMobile', this.sizeUpdated.bind(this));
    }

    // Update width of added child:
    onChildAdded(model, child) {
        if (!model.parent) {
            return;
        }
        const size = this.getSize(model);
        this.updateSize(size, child);
    }

    updateSize(size, model) {
        model.setWidth(size.width.desktop, {
            viewport: 'desktop'
        });
        model.setWidth(size.width.mobile, {
            viewport: 'mobile'
        });
    }

    onSettingsPanel(theModel, theView, theConfig) {
        return {
            onWillDisplay: ({
                model, view, config, template
            }) => {
                this.removedChildren = [];
                model.setFiltered('size', this.getSize(model));
            }
        };
    }

    getSize(model) {
        const size = this.getGridCount(model);
        const columnCountMobile = model.get('fields.columnCountMobile') || 1;
        const widthMobile = parseFloat((100 / columnCountMobile).toFixed(2));
        return {
            columns: size.columns,
            columnsMobile: columnCountMobile,
            rows: size.rows,
            width: {
                desktop: parseFloat((100 / size.columns).toFixed(2)),
                mobile: widthMobile
            }
        };
    }

    getGridCount(model) {
        const isSmallElementType = model.parent ? this.smallElementTypes.includes(model.parent.get('type')) : false;
        const defaults = isSmallElementType ? this.sizes.small : this.sizes.large;
        const columnCount = model.get('fields.columnCount') || defaults.columns;
        const rowCount = model.get('fields.rowCount') || defaults.rows;
        return {
            columns: parseInt(columnCount, 10),
            rows: parseInt(rowCount, 10)
        };
    }

    sizeUpdated(model) {
        const size = this.getSize(model);
        const children = model.getChildren();
        for (const child of children) {
            this.updateSize(size, child);
        }
        // Remove extra children:
        if (children.length > size.columns * size.rows) {
            children.slice(size.columns * size.rows).forEach((child) => {
                this.api.v1.model.delete(child);
                if (child.get('instance_of')) {
                    this.removedChildren.push(child);
                }
            });
        }
        // Add missing children:
        if (children.length < size.columns * size.rows) {
            for (let i = children.length; i < size.columns * size.rows; i++) {
                this.createAndInsert(model, this.removedChildren.shift());
            }
        }
    }

    createAndInsert(model, source) {
        if (source) {
            this.api.v1.model.addChild(model, lab_api.v1.model.copy(source));
        } else {
            this.api.v1.model.create.internal({
                type: 'image',
                contentdata: {
                    type: 'image',
                    fields: {}
                }
            }, model, true, false);
        }
    }

}
