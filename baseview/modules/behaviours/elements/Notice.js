import { DateTimeHelperInt } from '../../lib/helpers/datetime/DateTimeHelperInt.js';

export default class Notice {

    constructor(api) {
        this.api = api;
        this.dateTimeHelper = new DateTimeHelperInt();
    }

    onRender(model, view) {
        const timestamp = model.get('fields.modified') || model.get('fields.published');
        if (timestamp != null) {
            const date = new Date(timestamp * 1000);
            model.setFiltered('niceDate', this.dateTimeHelper.timestampToNiceDate(timestamp));
            model.setFiltered('publishedDate', this.dateTimeHelper.utcFormat(date, `${ this.api.v1.locale.get('dates.monthdayyear', { noRender: true }) } ${ this.api.v1.locale.get('dates.hourminute', { noRender: true }) }`));
            model.setFiltered('isoDate', date.toISOString());
        }
    }

}
