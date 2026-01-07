import { DateTimeHelper } from '../../lib/helpers/datetime/DateTimeHelper.js';

/**
 * @typedef {string}
 * @enum {TEST_METHODS}
 */
export const TEST_METHODS = {
    CLICK_RATIO_95_QUICK_EXIT: 'clickratio95qe',
    CLICK_RATIO_95: 'clickratio95'
};

export class AbTest {

    /**
     * @param {string} [data.id]
     * @param {string} [data.placeId]
     * @param {string} [data.status]
     * @param {{TEST_METHODS}} [data.testMethod]
     * @param {string} [data.url]
     * @param {string} [data.start]
     * @param {string} [data.end]
     * @param {Object<string, *>} [data.results]
     * @param {boolean} [data.published]
     * @param {boolean} [data.includeOriginal]
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.placeId = data.placeId || null;
        this.status = data.status || 'Not started';
        this.testMethod = data.testMethod || TEST_METHODS.CLICK_RATIO_95_QUICK_EXIT;
        this.methodoptions = {
            minVariantDifference: 23,
            minimumclicks: 100,
            defaultVariantWinner: 'best'
        };
        this.url = data.url || '';
        this.start = data.start || '';
        this.end = data.end || '';
        this.results = data.results || {};
        this.published = !!data.published || false;
        this.dateTimeHelper = new DateTimeHelper(lab_api.v1.config.get('lang') || 'no');
        this.includeOriginal = data.includeOriginal !== false;
    }

    static getTestMethods() {
        return [
            { key: TEST_METHODS.CLICK_RATIO_95, description: 'Clickratio using all clicks' },
            { key: TEST_METHODS.CLICK_RATIO_95_QUICK_EXIT, description: 'Clickratio without quick exits' }
        ];
    }

    get correct_start() {
        return this.toLocalDateString((this.start !== '') ? new Date(this.start) : '');
    }

    get correct_end() {
        return this.toLocalDateString((this.end !== '') ? new Date(this.end) : '');
    }

    isFinished() {
        return ['finished', 'inconclusive', 'stopped', 'concluded'].includes(this.status);
    }

    isRunning() {
        return (this.status === 'running' || this.status === 'pending');
    }

    toLocalDateString(date) {
        if (!date) {
            return '';
        }
        return new Date(date.getTime() + new Date().getTimezoneOffset() * -60 * 1000).toISOString().slice(0, 19);
    }

    serialize(preparedVariants, originalTitle, originalPublishedUrl) {
        const startDate = (this.start !== '') ? new Date(this.start) : '';
        const endDate = (this.end !== '') ? new Date(this.end) : '';
        const variants = [];
        if (this.includeOriginal) {
            // We need to add an item for the original article-teaser in data we send to Kilkaya
            // Client side it is identified as 'original' and we'll use the version rendered server side.
            // Use the actual title of the article to easier identify it in Kilkaya A/B GUI.
            const title = lab_api.v1.util.string.stripTags(originalTitle || 'Original article');
            const data = [
                { name: 'title', value: title },
                { name: 'identifier', value: 'original' }
            ];
            if (originalPublishedUrl) {
                data.push({ name: 'url', value: lab_api.v1.site.getSite().domain + originalPublishedUrl });
            }
            variants.push({
                vid: 1,
                active: this.includeOriginal,
                data,
                name: title
            });
        }
        let cc = 2;
        for (const [variant] of preparedVariants) {
            const item = {
                vid: cc,
                active: !variant.state.disabled,
                data: [
                    { name: 'title', value: lab_api.v1.util.string.stripTags(variant.data.contentdata.fields.title.value) },
                    { name: 'identifier', value: variant.guid }
                ],
                name: variant.name
            };
            if (variant.data.contentdata.fields.published_url) {
                item.data.push({ name: 'url', value: lab_api.v1.site.getSite().domain + variant.data.contentdata.fields.published_url.value });
            }
            variants.push(item);
            cc += 1;
        }
        return {
            id: this.id,
            placeId: this.placeId,
            status: this.status,
            testMethod: this.testMethod,
            methodoptions: JSON.stringify(this.methodoptions),
            url: this.url,
            // editurl: window.location.href,
            start: (startDate !== '') ? startDate.toISOString().slice(0, 19) : '',
            end: (endDate !== '') ? endDate.toISOString().slice(0, 19) : '',
            published: this.published,
            variants: JSON.stringify(variants)
        };
    }

    updateTestData(data) {
        for (const key in data) {
            if (key === 'url' && data[key] === null) {
                // eslint-disable-next-line no-continue
                continue;
            }
            if (key === 'methodoptions' && typeof data[key] === 'object') {
                for (const k of Object.keys(data[key])) {
                    const optionValue = ['minVariantDifference', 'minimumclicks'].includes(k) ? parseInt(data[key][k], 10) : data[key][k];
                    this.methodoptions[k] = optionValue;
                }
            } else if (key !== 'methodoptions') {
                this[key] = data[key];
            }
        }
    }

    shouldSave() {
        if (this.start !== '' || this.end !== '') {
            return true;
        }

        return false;
    }

}
