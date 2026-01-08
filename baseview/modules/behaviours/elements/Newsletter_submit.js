export default class Newsletter_submit {

    constructor(api) {
        this.api = api;
        this.signupText = api.v1.locale.get('newsletter.generic.signup');
        this.yourEmailText = api.v1.locale.get('newsletter.generic.yourEmail');
        this.subscribeButton = api.v1.locale.get('newsletter.generic.subscribeButton');
        this.hiddenValue = api.v1.locale.get('newsletter.generic.hiddenValue');
    }

    onRender(model, view) {
        const config = this.api.v1.config.get('contentbox_settings.newsletter_submit') || {};
        const fieldAction = model.get('fields.newsletterDataAction') || (config.action === "MAILMOJO_LENKE" ? '' : config.action) || '';
        const fieldTitle = model.get('fields.newsletterDataTitle');
        const fieldDescription = model.get('fields.newsletterDataDescription');
        const fieldButtonText = model.get('fields.newsletterButtonText') || this.subscribeButton;
        const fieldPlaceholder = model.get('fields.newsletterPlaceholder') || this.yourEmailText;

        const obj = {
            provider: config.provider ? config.provider : 'mailmojo',
            title: fieldTitle || (config.title ? config.title : this.signupText),
            description: fieldDescription || config.description || '',
            action: fieldAction,
            buttonText: fieldButtonText,
            placeholder: fieldPlaceholder,
            elements: config.elements ? config.elements : [
                {
                    type: 'hidden',
                    name: 'tagsadditional',
                    value: this.hiddenValue,
                    class: '',
                    placeholder: ''
                },
                {
                    type: 'email',
                    name: 'email',
                    value: '',
                    class: '',
                    placeholder: fieldPlaceholder
                },
                {
                    type: 'submit',
                    name: 'submit',
                    value: fieldButtonText,
                    class: 'bg-secondary',
                    placeholder: ''
                }
            ]
        };

        if (this.api.v1.app.mode.isFront() && !obj.action) {
            model.setFiltered('newsletter_data', null);
        } else {
            model.setFiltered('newsletter_data', obj);
        }
    }
}

