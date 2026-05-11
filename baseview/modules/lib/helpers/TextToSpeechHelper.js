/**
 * TextToSpeechHelper
 *
 * Helper to calculate effective Text-to-Speech settings for article models.
 * Combines global config with article-specific overrides.
 */

export class TextToSpeechHelper {

    /**
     * Calculate effective Text-to-Speech settings.
     *
     * Returns settings object for the caller to consume.
     *
     * @param {Object} model - The page_article model
     * @param {Object} api - The Labrador API instance
     * @returns {Object} Effective settings
     *   {
     *     texttospeechEnabled: boolean,
     *     video: boolean,        // provider-specific setting
     *     globalConfig: Object   // full texttospeech config
     *   }
     */
    static getEffectiveSettings(model, api) {
        const audioSettings = api.v1.config.get('audio_settings') || {};
        const textToSpeechConfig = audioSettings.texttospeech || {};
        const providerConfig = textToSpeechConfig.provider || {};

        // Global TTS setting
        const globalTexttospeechEnabled =
            textToSpeechConfig.enabledGlobally || false;
        const globalhidePlacementInEditor =
            textToSpeechConfig.hidePlacementInEditor || false;
        
        // Article-specific overrides (set in modules/apps/article/ArticleAudio.js)
        const articleTexttospeechEnabled =
            model.get('fields.texttospeechEnabled');
        const articlehidePlacementInEditor =
            model.get('fields.hidePlacementInEditor');

        // Resolve effective Text-to-Speech enabled
        const effectiveTexttospeechEnabled =
            articleTexttospeechEnabled !== undefined &&
            articleTexttospeechEnabled !== null
                ? (articleTexttospeechEnabled === true ||
                   articleTexttospeechEnabled === '1')
                : globalTexttospeechEnabled;
        
        const effectivehidePlacementInEditor =
            articlehidePlacementInEditor !== undefined &&
            articlehidePlacementInEditor !== null
                ? (articlehidePlacementInEditor === true ||
                   articlehidePlacementInEditor === '1')
                : globalhidePlacementInEditor;
        
        // Provider-specific global setting
        const globalProvidervideo =
            providerConfig.video || false;

        return {
            texttospeechEnabled: effectiveTexttospeechEnabled,
            hidePlacementInEditor: effectivehidePlacementInEditor,
            video: globalProvidervideo,
            globalConfig: textToSpeechConfig
        };
    }

    /**
     * Insert a texttospeech element if TTS is enabled and one does not already exist.
     *
     * Must be called from an entry-level onAcceptContent hook (e.g. Front.js) in front mode,
     * or from onPrepareViewHelper in editor mode. Behaviour-hook onAcceptContent runs before
     * the model tree is ready for insertions and will throw a 500 in front mode.
     *
     * @param {Object} api - The Labrador API instance
     * @param {Object} model - The page_article model
     * @param {Object} options
     * @param {boolean} options.isEditor - Pass state flags for the non-persistent editor preview
     */
    static insertIfNeeded(api, model, { isEditor = false } = {}) {
        const settings = TextToSpeechHelper.getEffectiveSettings(model, api);

        // If config doesn't allow insertion, return
        if (!settings.globalConfig.enable || !settings.texttospeechEnabled) { return; }

        // In editor mode, skip insertion if the placement should be hidden
        if (isEditor && settings.hidePlacementInEditor) { return; }

        // Don't insert if a TTS box is present in article
        if (api.v1.model.query.getModelByType('texttospeech')) { return; }

        // Where to insert
        const path = settings.globalConfig.path || 'page_article/bodytext';
        const bodyTextIndex = settings.globalConfig.bodyTextIndex != null ? settings.globalConfig.bodyTextIndex : 0;
        const index = settings.globalConfig.index != null ? settings.globalConfig.index : 0;

        // Do the insertion
        api.v1.model.insert.atPath({
            path,
            data: {
                type: 'texttospeech',
                // Non-persistent insertion in editor
                ...(isEditor ? {
                    state: {
                        isNonPersistent: true,
                        editNonPersistent: true,
                        draggableDisabled: true
                    }
                } : {}),
                metadata: {
                    isBodytext: true,
                    bodyTextIndex,
                    autoInserted: true
                },
                contentdata: {
                    fields: {
                        video: settings.video
                    }
                }
            },
            options: {
                index,
                persistentTarget: true,
                intermediate: {
                    useExisting: true
                },
                silent: true
            }
        });
    }
}