export class LayoutHelper {

    static textElements(view, isEditor) {
        const layout = {
            top: [],
            floating: [],
            bottom: [],
            positions: {
                kicker: '',
                title: ''
            }
        };

        let kickerPosition = '';
        let titlePosition = '';

        // Process the kicker first
        if (view.get('metadata.showKicker') && (isEditor || (!!view.get('fields.kicker') || !!view.get('fields.origin_data_json.teaserKicker') || !!view.get('fields.origin_data_json.kicker')))) {
            if (view.get('metadata.floatingKicker')) {
                layout.floating.push('kicker');
                layout.positions.kicker = 'floating';
                kickerPosition = 'floating';
            } else if (!view.get('metadata.kickerBelowImage')) {
                layout.top.push('kicker');
                layout.positions.kicker = 'above';
                kickerPosition = 'top';
            } else {
                layout.bottom.push('kicker');
                layout.positions.kicker = 'below';
                kickerPosition = 'bottom';
            }
        }

        // Process the title
        if (!view.get('metadata.hideTitle') && (isEditor || !!view.get('fields.title'))) {
            if (view.get('metadata.floatingTitle')) {
                layout.floating.push('title');
                layout.positions.title = 'floating';
                titlePosition = 'floating';
            } else if (view.get('metadata.titleAboveImage')) {
                layout.top.push('title');
                layout.positions.title = 'above';
                titlePosition = 'top';
            } else {
                layout.bottom.push('title');
                layout.positions.title = 'below';
                titlePosition = 'bottom';
            }
        }

        // Adjust the kicker's position if kickerBelowTitle is set
        if (view.get('metadata.kickerBelowTitle') && view.get('metadata.showKicker')) {
            if (titlePosition) {
                // Remove 'kicker' from its current array
                if (kickerPosition) {
                    const index = layout[kickerPosition].indexOf('kicker');
                    if (index !== -1) {
                        layout[kickerPosition].splice(index, 1);
                    }
                }

                // Insert 'kicker' after 'title' in the title's position array
                const positionArray = layout[titlePosition];
                const titleIndex = positionArray.indexOf('title');
                if (titleIndex !== -1) {
                    positionArray.splice(titleIndex + 1, 0, 'kicker');
                } else {
                    // If 'title' not found, add 'kicker' to the position array
                    positionArray.push('kicker');
                }
                layout.positions.kicker = 'belowTitle';
                kickerPosition = titlePosition;
            }
        }

        // Process the subtitle
        if (!view.get('metadata.hidesubtitle') && (isEditor || (!!view.get('fields.subtitle') || !!view.get('fields.origin_data_json.teaserSubtitle')))) {
            if (view.get('metadata.floatingSubtitle')) {
                layout.floating.push('subtitle');
            } else if (view.get('metadata.subtitleAboveImage')) {
                layout.top.push('subtitle');
            } else {
                layout.bottom.push('subtitle');
            }
        }

        return layout;
    }

}
