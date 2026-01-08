export class ArticleDates {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.enabled = true;
        this.dom = {
            'fields.published': {
                date: null,
                time: null
            },
            'fields.hidefromfp_time': {
                date: null,
                time: null
            },
            'fields.calendar_start_date': {
                date: null,
                time: null
            },
            'fields.calendar_end_date': {
                date: null,
                time: null
            }
        };
        this.template = `<div class="lab-modal-form lab-grid lab-hidden">
            <div class="lab-formgroup lab-grid">
                <h2 class="lab-title lab-grid-large-12 lab-grid-gap">{{{ title }}}</h2>
                <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap lab-space-below-medium">
                    <p class="lab-info">Note: The datepicker uses your device's local timezone.</p>
                </div>
                <div class="lab-formgroup-item lab-grid-large-6 lab-grid-gap lab-space-below-medium">
                    <label for="publishedDateTime">Date and time</label>
                    <input type="datetime-local" id="publishedDateTime" name="fields.published" value="{{ datetime.publishedDateTime }}">
                </div>
            </div>
            <div class="lab-formgroup lab-grid">
                <h4 class="lab-title lab-grid-large-12 lab-grid-gap">Hide on front after</h4>
                <div class="lab-formgroup-item lab-grid-large-6 lab-grid-gap lab-space-below-small">
                    <label for="hidefromfp_timeDateTime">Date and time</label>
                    <input type="datetime-local" id="hidefromfp_timeDateTime" name="fields.hidefromfp_time" value="{{ datetime.hideDateTime }}">
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap lab-space-below-medium">
                    <p class="lab-info">
                        This date affects automatic articles on front pages.
                    </p>
                </div>
            </div>
            <div class="lab-formgroup lab-grid">
                <h4 class="lab-title lab-grid-large-12 lab-grid-gap">Calendar dates</h4>
                <div class="lab-formgroup-item lab-grid-large-6 lab-grid-gap lab-space-below-medium">
                    <label for="calendar_start_date-dateTime">From date and time</label>
                    <input type="datetime-local" id="calendar_start_date-dateTime" name="fields.calendar_start_date" value="{{ datetime.calendarFromDateTime }}">
                </div>
                <div class="lab-formgroup-item lab-grid-large-6 lab-grid-gap lab-space-below-small">
                    <label for="calendar_end_date-dateTime">To date and time</label>
                    <input type="datetime-local" id="calendar_end_date-dateTime" name="fields.calendar_end_date" value="{{ datetime.calendarToDateTime }}">
                </div>
                <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap lab-space-below-medium">
                    <p class="lab-info">
                        The calendar dates are used by elements like <span class="lab-label">Article Calendar</span> and <span class="lab-label">Article Scroller</span> to limit visibility to a date range.
                    </p>
                </div>
            </div>
        </div>`;
    }

    // {"published":1638362580,"hidefromfp_time":1750153380}}]
    // {"calendar_start_date":"2022-03-01T03:00:00Z"}
    // {"calendar_end_date":"2030-03-01T11:59:00Z"}

    // SettingsFront: If section exist: add item to it, if not: create.
    onAside() {
        return {
            section: 'General',
            label: 'Dates'
        };
    }

    onPaths() {
        return {
            'fields.published': {
                node: 'fields.published',
                transformer: (value, pathInfo) => this.dateTransformer(pathInfo),
                validator: 'isValidDate'
            },
            'fields.hidefromfp_time': {
                node: 'fields.hidefromfp_time',
                transformer: (value, pathInfo) => this.dateTransformer(pathInfo),
                validator: 'isValidDate'
            },
            'fields.calendar_start_date': {
                node: 'fields.calendar_start_date',
                transformer: (value, pathInfo) => this.dateTransformer(pathInfo, false),
                validator: 'isValidDate'
            },
            'fields.calendar_end_date': {
                node: 'fields.calendar_end_date',
                transformer: (value, pathInfo) => this.dateTransformer(pathInfo, false),
                validator: 'isValidDate'
            }
        };
    }

    dateTransformer(pathInfo, toTimestamp = true) {
        const dateTime = this.dom[pathInfo.node].dateTime.value;
        if (toTimestamp) {
            return this.getTimestamp(dateTime);
        }
        return `${ new Date(dateTime).toISOString().split('.')[0] }Z`;
    }

    onMarkup() {
        const datetime = {
            publishedDateTime: '',
            hideDateTime: '',
            calendarFromDateTime: '',
            calendarToDateTime: ''
        };

        const published = this.rootModel.get('fields.published'); // timestamp
        const hidefromfp_time = this.rootModel.get('fields.hidefromfp_time'); // timestamp
        const calendar_start_date = this.rootModel.get('fields.calendar_start_date'); // ISO-date
        const calendar_end_date = this.rootModel.get('fields.calendar_end_date'); // ISO-date

        if (published) {
            const dt = this.getDateTime(published);
            datetime.publishedDateTime = dt;
        }
        if (hidefromfp_time) {
            const dt = this.getDateTime(hidefromfp_time);
            datetime.hideDateTime = dt;
        }
        if (calendar_start_date) {
            const timestamp = new Date(calendar_start_date).valueOf() / 1000;
            const dt = this.getDateTime(timestamp);
            datetime.calendarFromDateTime = dt;
        }
        if (calendar_end_date) {
            const timestamp = new Date(calendar_end_date).valueOf() / 1000;
            const dt = this.getDateTime(timestamp);
            datetime.calendarToDateTime = dt;
        }

        const title = published * 1000 > Date.now() || !published ? 'Scheduled publish date' : 'Published date';

        const markup = this.api.v1.util.dom.renderTemplate(this.template, {
            datetime,
            title
        }, true);
        this.dom['fields.published'].dateTime = markup.querySelector('#publishedDateTime');
        this.dom['fields.hidefromfp_time'].dateTime = markup.querySelector('#hidefromfp_timeDateTime');
        this.dom['fields.calendar_start_date'].dateTime = markup.querySelector('#calendar_start_date-dateTime');
        this.dom['fields.calendar_end_date'].dateTime = markup.querySelector('#calendar_end_date-dateTime');

        return markup;
    }

    getTimestamp(dateTime) {
        const d = new Date(`${ dateTime }Z`);
        const localDate = new Date(d.valueOf() + d.getTimezoneOffset() * 60000);
        return localDate.getTime() / 1000;
    }

    getDateTime(timestamp) {
        const date = new Date(timestamp * 1000);
        const year = date.getFullYear();
        let month = date.getMonth() + 1;
        if (month < 10) month = `0${ month }`;
        let day = date.getDate();
        if (day < 10) day = `0${ day }`;
        let hour = date.getHours();
        if (hour < 10) hour = `0${ hour }`;
        let minute = date.getMinutes();
        if (minute < 10) minute = `0${ minute }`;

        return `${ year }-${  month  }-${  day }T${ hour  }:${  minute }`;
    }

}
