import { PageAPI } from '../../lib/api/PageAPI.js';
import { PageData } from '../../lib/PageData.js';
import { DateTimeHelperInt } from '../../lib/helpers/datetime/DateTimeHelperInt.js';

export default class Article {

    constructor(api) {
        this.api = api;
        this.pageData = new PageData(this.api, new PageAPI(this.api));
        this.dateTimeHelper = new DateTimeHelperInt();
    }

    onReady(model, view) {
        this.pageData.set(model, view);
        const timestampModified = model.get('fields.modified');
        const timestampPublished = model.get('fields.published');
        const timestamp = timestampModified || timestampPublished;
        if (timestamp != null) {
            const date = new Date(timestamp * 1000);
            model.setFiltered('niceDate', this.dateTimeHelper.timestampToNiceDate(timestamp));
            model.setFiltered('publishedDate', this.dateTimeHelper.utcFormat(date, `${ this.api.v1.locale.get('dates.monthdayyear', { noRender: true }) } ${ this.api.v1.locale.get('dates.hourminute', { noRender: true }) }`));
            model.setFiltered('isoDate', date.toISOString());
            model.setFiltered('date', {
                published: {
                    isoDate: timestampPublished ? new Date(timestampPublished * 1000).toISOString() : null
                },
                modified: {
                    isoDate: timestampModified ? new Date(timestampModified * 1000).toISOString() : null
                }
            });
        }
        model.setFiltered('tagPagePath', this.api.v1.config.get('tagPagePath') || '/tag/');

        if (model.get('filtered.hasInsertedRelatedContent')) {
            return;
        }

        const tags = model.get('tags') || [];

        const label = this.api.v1.locale.get('notice.relatedContent.header');
        const labelElement = {
            type: 'text_singleline',
            contentdata: {
                fields: {
                    text: label,
                    elementType: 'h2'
                }
            }
        };

        this.api.v1.model.insert.atPath({
            path: 'dropZone/',
            data: {
                type: 'row',
                metadata: {
                    spaceOutsideTop: 'large',
                    spaceOutsideBottom: 'medium'
                    // hasRowTitle: true,
                    // rowTitle: 'Related'
                },
                children: [labelElement, {
                    type: 'livefeed',
                    contentdata: {
                        id: 122, // Note: Element needs an ID to properly render script nessesary for swipe functionality.
                        fields: {
                            tags: tags.join(','),
                            maxNoticesCount: 20
                        }
                    },
                    metadata: {
                        blacklist: [model.get('id')]
                    },
                    width: 66.66
                }, {
                    type: 'frontContent',
                    contentdata: {
                        fields: {
                            organizer: 'RowsAndColumns',
                            source: 'lab-api-site',
                            tags_allow: true,
                            tags_useOr: true,
                            tags_string: tags.join(','),
                            hide_kicker: true,
                            hide_subtitle: true,
                            layout_rowCount: '20',
                            layout_columnCount: '1',
                            size_active: true,
                            size_title: 24
                        }
                    },
                    width: 33.33
                }],
                state: {
                    isNonPersistent: true
                }
            }
            // options: {
            //     index: 0
            // }
        });

        model.setFiltered('hasInsertedRelatedContent', true);
    }

}
