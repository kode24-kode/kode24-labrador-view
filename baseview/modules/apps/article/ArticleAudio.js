export class ArticleAudio {

    constructor(api, params) {
        this.api = api;
        this.rootModel = params.rootModel;
        this.setter = params.setter;
        this.log = params.log;
        this.enabled = true;
        this.dom = {
            audioFields: {
                url: null,
                title: null,
                playTime: null,
                fileType: null,
                disableField: null
            }
        };
        this.bindingsHandler = this.onMarkup.bind(this);
        this.hasAudioCollection = this.api.v1.config.get('drawerAdditions').some((item) => item.collection === 'Audio');

        this.template = `<div class="lab-modal-form lab-grid lab-hidden">

            <div class="lab-formgroup-item lab-grid-large-12">
                <div class="lab-grid lab-grid-gap">
                    <h2 class="lab-title lab-grid-large-12 lab-grid-gap lab-space-above-none">Audio</h2>
                    <input class="lab-grid-large-8 lab-grid-gap" type="url" {{ #audio.disableField }}disabled{{ /audio.disableField }} id="teaser-audio-url" value="{{ audio.url }}" placeholder="Teaser Audio Url ...">
                    <input class="lab-grid-large-4 lab-grid-gap" type="button" {{ ^audio.disableField }}disabled{{ /audio.disableField }} id="btn-remove-teaser-audio-url" value="Remove audio file">
                    <div class="lab-formgroup-item lab-grid-large-12 lab-grid-gap">
                        <p class="lab-info">Adding a file here allows for the audio clip to be played directly from the front page teaser.</p>
                    </div>
                    {{ #hasAudioCollection }}
                        <div class="audio-file-info lab-grid-gap lab-grid-large-7 lab-space-above-small">
                                <div>Title: <strong id="audio-file-title">{{ audio.title }}</strong></div>
                                <div>Duration: <strong id="audio-file-duration">{{ audio.playTime}}</strong></div>
                                <div>Type: <strong id="audio-file-type">{{ audio.fileType }}</strong></div>
                        </div>
                        <input class="lab-grid-gap lab-grid-large-5" type="button" id="btn-add-teaser-audio-url" value="Add audio file from library">
                    {{ /hasAudioCollection }}
                 </div>
            </div>
 
        </div>`;
    }

    onAside() {
        return {
            section: 'General',
            label: 'Audio'
        };
    }

    onPaths() {
        return {};
    }

    onMarkup() {
        const markup = this.api.v1.util.dom.renderTemplate(this.template, {
            fields: {
                teaserAudio: this.rootModel.get('fields.teaserAudio')
            },
            hasAudioCollection: this.hasAudioCollection,
            audio: {
                disableField: this.rootModel.get('fields.teaserAudio.urlFieldDisabled') || Boolean(this.rootModel.get('fields.teaserAudio')),
                title: this.rootModel.get('fields.teaserAudio.title'),
                playTime: this.rootModel.get('fields.teaserAudio.playTime'),
                fileType: this.rootModel.get('fields.teaserAudio.fileType'),
                url: this.rootModel.get('fields.teaserAudio')
            }
        }, true);

        this.dom.audioFields.url = markup.querySelector('#teaser-audio-url');
        const audioField = markup.querySelector('#teaser-audio-url');
        const btnAddAudioFile = markup.querySelector('#btn-add-teaser-audio-url');
        const btnRemoveAudioFile = markup.querySelector('#btn-remove-teaser-audio-url');

        btnRemoveAudioFile.addEventListener('click', (event) => {
            this.removeAudioFile(btnAddAudioFile, btnRemoveAudioFile);
        }, false);

        audioField.addEventListener('change', (event) => {
            this.rootModel.set('fields.teaserAudio', audioField.value);
            this.rootModel.set('fields.teaserAudio.urlFieldDisabled', true);
            this.log({
                type: 'data',
                app: this.constructor.name,
                path: 'fields.teaserAudio'
            });
            this.dom.audioFields.url.disabled = true;
            btnRemoveAudioFile.disabled = false;
        });

        if (this.hasAudioCollection) {
            if (this.dom.audioFields.url.value) {
                btnAddAudioFile.value = 'Change audio file';
                btnRemoveAudioFile.disabled = false;
                this.dom.audioFields.url.disabled = true;
            }
            this.dom.audioFields.title = markup.querySelector('#audio-file-title');
            this.dom.audioFields.playTime = markup.querySelector('#audio-file-duration');
            this.dom.audioFields.fileType = markup.querySelector('#audio-file-type');

            btnAddAudioFile.addEventListener('click', (event) => {
                this.addAudioFile(btnAddAudioFile, btnRemoveAudioFile);
            }, false);

        }

        return markup;
    }

    addAudioFile(addBtn, removeBtn, urlField) {
        this.api.v1.collection.display({
            name: 'Audio',
            modal: true,
            skipCache: true,
            options: {
                label: 'Audio files',
                clickHandler: (model, element) => {
                    this.models.audio = model;
                    this.rootModel.set('fields.teaserAudio', model.get('fields.url'));
                    this.rootModel.set('fields.teaserAudio.title', model.get('fields.title'));
                    this.rootModel.set('fields.teaserAudio.playTime', model.get('fields.playTime'));
                    this.rootModel.set('fields.teaserAudio.fileType', model.get('fields.fileType'));
                    this.rootModel.set('fields.teaserAudio.urlFieldDisabled', true);
                    this.dom.audioFields.url.value = model.get('fields.url');
                    this.dom.audioFields.title.innerHTML = model.get('fields.title');
                    this.dom.audioFields.playTime.innerHTML = model.get('fields.playTime');
                    this.dom.audioFields.fileType.innerHTML = model.get('fields.fileType');
                    this.dom.audioFields.url.disabled = true;
                    addBtn.value = 'Change audio file';
                    removeBtn.disabled = false;
                }
            }
        });
    }

    removeAudioFile(addBtn, removeBtn) {
        this.rootModel.set('fields.teaserAudio', null);
        this.dom.audioFields.url.value = null;
        this.dom.audioFields.url.disabled = false;
        this.rootModel.set('fields.teaserAudio.urlFieldDisabled', null);
        removeBtn.disabled = true;

        if (this.hasAudioCollection) {
            this.rootModel.set('fields.teaserAudio.title', null);
            this.rootModel.set('fields.teaserAudio.playTime', null);
            this.rootModel.set('fields.teaserAudio.fileType', null);
            this.dom.audioFields.title.innerHTML = null;
            this.dom.audioFields.playTime.innerHTML = null;
            this.dom.audioFields.fileType.innerHTML = null;
            addBtn.value = 'Add audio file from library';
        }

        this.log({
            type: 'data',
            app: this.constructor.name,
            path: 'fields.teaserAudio'
        });
    }

}
