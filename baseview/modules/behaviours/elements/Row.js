import { Movable } from '../../lib/helpers/Movable.js';

export default class Markup {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
    }

    onInserted(model) {
        if (!this.isEditor) {
            const dateString = model.get('metadata.visibleAfterDate');
            if (dateString) {
                const date = this.stringToDate(dateString);
                if (date) {
                    const now = new Date().getTime();
                    if (date.getTime() > now) {
                        Sys.logger.debug(`[Baseview] The path 'metadata.visibleAfterDate' ('${ dateString }') has prevented the row '${ model.getPositionedPath() }' from rendering`);
                        this.api.v1.model.noRender(model);
                    }
                }
            }
        }
    }

    onChildAdded(model, child) {
        this.updateFutureFlag(model);
    }

    onChildRemoved(model, child) {
        this.updateFutureFlag(model);
    }

    onRender(model, view) {
        if (!this.isEditor && !model.hasNodeData(true)) {
            this.api.v1.model.noRender(model);
            return;
        }
        if (view.get('metadata.movableContent')) {
            model.setFiltered('movableStyle', Movable.createStyle(model, 'metadata.contentPosition', ['desktop', 'mobile']));
        }
        if (!this.isEditor) {
            return;
        }
        const dateString = model.get('metadata.visibleAfterDate');
        if (dateString) {
            const date = this.stringToDate(dateString);
            if (date) {
                const now = new Date().getTime();
                if (date.getTime() > now) {
                    view.addCssStates(['hidden-on-front', 'has-date-restriction']);
                }
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                model.setFiltered('visibleAfterDate', date.toISOString().slice(0, 16));
            }
        } else if (model.get('filtered.visibleAfterDate')) {
            view.resetCssState();
            model.setFiltered('visibleAfterDate', null);
        }
    }

    onSettingsPanel() {
        return {
            onSubmit: ({
                model, formValues
            }) => {
                for (const view of this.api.v1.view.getViews(model)) {
                    view.resetCssState();
                }
                const date = this.stringToDate(formValues['metadata.visibleAfterDate']); // "2023-06-08T10:44"
                let value;
                if (date) {
                    value = date.toISOString(); // '2023-06-08T08:44:00.000Z'
                } else {
                    model.setFiltered('visibleAfterDate', null);
                    value = null;
                }
                model.set('metadata.visibleAfterDate', value);
            }
        };
    }

    stringToDate(dateString) {
        const date = new Date(dateString || '');
        if (date instanceof Date && Number.isFinite(date.getTime())) {
            return date;
        }
        return null;
    }

    // Check if any child has a future publish date and update the row publish date (metadata.visibleAfterDate) if needed
    updateFutureFlag(model) {
        const currentVisibleAfterDate = model.get('metadata.visibleAfterDate');
        const hasDate = !!currentVisibleAfterDate;
        let visibleAfterDate = null;
        for (const child of model.getChildren()) {
            const published = child.get('fields.published');
            if (published) {
                const date = new Date(published).getTime();
                if (date > new Date().getTime()) {
                    if (date > visibleAfterDate) {
                        visibleAfterDate = date;
                    }
                }
            }
        }
        if (visibleAfterDate) {
            model.set('metadata.visibleAfterDate', new Date(visibleAfterDate).toISOString());
            this.api.v1.model.highlight.message(model, `Publish-date updated for row`);
            Sys.logger.debug(`[Baseview] The row '${ model.getPositionedPath() }' has set publish date to '${ new Date(visibleAfterDate).toISOString() }'.`);
        } else if (hasDate) {
            model.set('metadata.visibleAfterDate', null);
            this.api.v1.model.highlight.message(model, `Publish-date removed for row`);
            Sys.logger.debug(`[Baseview] The row '${ model.getPositionedPath() }' has removed publish date.`);
        }
    }

}
