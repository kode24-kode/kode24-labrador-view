import { PageAPI } from '../../lib/api/PageAPI.js';
import { PageData } from '../../lib/PageData.js';
import { AutodataHelper } from '../../lib/helpers/AutodataHelper.js';
import { TextToSpeechHelper } from '../../lib/helpers/TextToSpeechHelper.js';

export default class Article {

    constructor(api) {
        this.api = api;
        this.pageData = new PageData(this.api, new PageAPI(this.api));
    }

    onReady(model, view) {
        this.pageData.set(model, view);

        model.setFiltered('autodata_css', AutodataHelper.parseCss(model));
        model.setFiltered('autodata_attributes', AutodataHelper.parseAttributes(model));
        model.setFiltered('autodata_custom', AutodataHelper.parseCustomData(model));

        const audioSettings = TextToSpeechHelper.getEffectiveSettings(model, this.api);
        model.setFiltered('hidePlacementInEditor', audioSettings.hidePlacementInEditor);

        
        if (this.api.v1.app.mode.isEditor()) {
            // Bind "Article Settings -> Audio -> Text-to-Speech enabled"
            // to auto-insert/remove TTS content box on toggle.
            this.api.v1.model.bindings.bind(
                model,
                'fields.texttospeechEnabled',
                this._syncTexttospeechElement.bind(this)
            );
            // Bind "Article Settings -> Audio -> Hide placement in editor"
            // to keep the effective filtered value in sync.
            this.api.v1.model.bindings.bind(
                model,
                'fields.hidePlacementInEditor',
                this._syncHidePlacementInEditor.bind(this)
            );
        }
    }

    // Editor-mode insertion runs here - after updateBodytextAds() has swept non-persistent
    // elements in onAcceptContent. Front-mode insertion is handled by Front.js, because
    // insert.atPath is only safe from entry-level hooks, not behaviour hooks (see
    // TextToSpeechHelper.insertIfNeeded for details).
    onPrepareViewHelper(model) {
        if (!this.api.v1.app.mode.isEditor()) { return; }
        TextToSpeechHelper.insertIfNeeded(this.api, model, { isEditor: true });
    }

    _syncHidePlacementInEditor(model) {
        const settings = TextToSpeechHelper.getEffectiveSettings(model, this.api);
        model.setFiltered('hidePlacementInEditor', settings.hidePlacementInEditor);

        const existingTts = this.api.v1.model.query.getModelByType('texttospeech');
        if (settings.hidePlacementInEditor) {
            if (existingTts && existingTts.get('metadata.autoInserted')) {
                this.api.v1.model.delete(existingTts);
            }
        } else {
            if (!existingTts) {
                TextToSpeechHelper.insertIfNeeded(this.api, model, { isEditor: true });
            } else {
                this.api.v1.model.addToRedrawQueue(existingTts, true);
            }
        }
    }

    _syncTexttospeechElement(model) {
        const settings = TextToSpeechHelper.getEffectiveSettings(model, this.api);
        const existingTts = this.api.v1.model.query.getModelByType('texttospeech');

        if (settings.texttospeechEnabled) {
            if (!existingTts) {
                TextToSpeechHelper.insertIfNeeded(this.api, model, { isEditor: true });
            }
        } else if (existingTts && existingTts.get('metadata.autoInserted')) {
            // Only remove the auto-inserted preview, never a user-placed persistent element
            this.api.v1.model.delete(existingTts);
        }
    }
}
