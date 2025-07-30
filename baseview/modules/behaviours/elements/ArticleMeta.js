import { DateTimeHelperInt } from '../../lib/helpers/datetime/DateTimeHelperInt.js';

export default class ArticleMeta {

    constructor(api) {
        this.api = api;
    }

    onRender(model, view) {
        const lang = lab_api.v1.config.get('contentLanguage') || 'no';
        const stringSettings = {
            publishedLabel: 'Publisert',
            unpublishedLabel: '(upublisert) Opprettet',
            modifiedLabel: 'Sist oppdatert',
            readTimeLabel: 'Lesetid',
            unifiedLabel: '',
            languageCode: lang,
            niceDates: false,
            dateFormat: 'l d. F Y - H:i',
            dateFormatPrependZero: true,
            timeFormatPrependZero: true,
            template: '{{dddd}} {{DD}}. {{MMMM}} {{YYYY}} - {{HH}}:{{mm}}',
            useOldFormat: false
        };
        // If language is english
        if (lang === 'en') {
            stringSettings.publishedLabel = 'Published';
            stringSettings.unpublishedLabel = '(unpublished) Created';
            stringSettings.modifiedLabel = 'Last updated';
            stringSettings.readTimeLabel = 'Read time';
            stringSettings.languageCode = 'en';
        }

        // Let config override:
        const config = this.api.v1.config.get('contentbox_settings.articleMeta.date');
        if (config) {
            for (const key in config) {
                if (key && stringSettings[key] !== undefined) {
                    stringSettings[key] = config[key];
                }
            }

            if ('dateFormat' in config && !('template' in config)) {
                stringSettings.useOldFormat = true;
            }
        }

        // Admin will override config
        const dateTimeFormat = this.api.v1.locale.get('dates.dateTime', { noRender: true, fallbackValue: null });
        if (dateTimeFormat) {
            stringSettings.template = dateTimeFormat;
        }

        // Fields "published" and "created" are derived from page-node in properties.json.
        // Access page-data directly via the model.
        // Note: This is also used in page-template (published/modified meta-fields)

        const dateHandler = new DateTimeHelperInt(stringSettings.languageCode);
        let label = stringSettings.publishedLabel;
        let articleTimestamp = model.get('fields.published');
        const modifiedTimestamp = model.get('fields.modified') >= articleTimestamp ? model.get('fields.modified') : null;

        model.setFiltered('unpublished', false);

        if (!articleTimestamp) {
            label = stringSettings.unpublishedLabel;
            model.setFiltered('unpublished', true);
            articleTimestamp = model.get('fields.created');
        }

        let hideModifiedDate = this.api.v1.config.get('contentbox_settings.articleMeta.hideModifiedDate');
        if (!hideModifiedDate) {
            hideModifiedDate = model.get('fields.hidePublishedDate');
        }

        const hidePublishedDate = model.get('fields.hidePublishedDate');
        const publishedDate = new Date(articleTimestamp * 1000);
        const modifiedDate = modifiedTimestamp ? new Date(modifiedTimestamp * 1000) : null;

        const published = {
            isoDate: publishedDate.toISOString(),
            label,
            timestamp: articleTimestamp,
            hide: hidePublishedDate,
            formatted: ''
        };

        const modified = {
            isoDate: modifiedDate ? modifiedDate.toISOString() : '',
            label: stringSettings.modifiedLabel,
            timestamp: modifiedTimestamp,
            hide: hideModifiedDate,
            formatted: ''
        };

        // Unified: Display modified-date if exist. If not: Use publish-date
        const displayUnifiedDate = this.api.v1.config.get('contentbox_settings.articleMeta.displayUnifiedDate');
        const unified = { hide: true };
        if (displayUnifiedDate) {
            unified.hide = false;
            unified.isoDate = (modifiedDate || publishedDate).toISOString();
            unified.timestamp = modifiedTimestamp || articleTimestamp;
            unified.label = stringSettings.unifiedLabel;
            unified.formatted = '';
            published.hide = true;
            modified.hide = true;
        }

        // Note: Use old format if specified. stringSettings.useOldFormat will default to true if the customer overwrites "dateFormat" in their config, while not overwriting "template".
        if (stringSettings.niceDates) {
            if (!published.hide) published.formatted = dateHandler.timestampToNiceDate(dateHandler.toTimestamp(publishedDate));
            if (modifiedDate && !modified.hide) {
                modified.formatted = dateHandler.timestampToNiceDate(dateHandler.toTimestamp(modifiedDate));
            }
            if (!unified.hide) {
                unified.formatted = dateHandler.timestampToNiceDate(dateHandler.toTimestamp(modifiedDate || publishedDate));
            }
        } else if (stringSettings.useOldFormat) {
            if (!published.hide) published.formatted = dateHandler.formattedUtcDate(publishedDate, stringSettings.dateFormat, stringSettings.dateFormatPrependZero, stringSettings.timeFormatPrependZero);
            if (modifiedDate && !modified.hide) {
                modified.formatted = dateHandler.formattedUtcDate(modifiedDate, stringSettings.dateFormat, stringSettings.dateFormatPrependZero, stringSettings.timeFormatPrependZero);
            }
            if (!unified.hide) {
                unified.formatted = dateHandler.formattedUtcDate(modifiedDate || publishedDate, stringSettings.dateFormat, stringSettings.dateFormatPrependZero, stringSettings.timeFormatPrependZero);
            }
        } else {
            if (!published.hide) published.formatted = dateHandler.utcFormat(publishedDate, stringSettings.template);
            if (modifiedDate && !modified.hide) {
                modified.formatted = dateHandler.utcFormat(modifiedDate, stringSettings.template);
            }
            if (!unified.hide) {
                unified.formatted = dateHandler.utcFormat(modifiedDate || publishedDate, stringSettings.template);
            }
        }

        model.setFiltered('date', { published, modified, unified });

        // Date-info is now accessible in template.

        const readTime = model.get('fields.readTime') || 0.5;
        const { readTimeLabel } = stringSettings;
        model.setFiltered('readTime', readTime < 1 ? '< 1 min' : `${ readTime } min`);
        model.setFiltered('readTimeLabel', readTimeLabel);
    }

    onInserted(model) {
        // Todo: Add default byline
    }

}
