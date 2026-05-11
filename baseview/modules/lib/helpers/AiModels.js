/**
 * AiModels helper class
 *
 * Centralized management of AI models with support for:
 * - Text and Image model separation
 * - Default model selection
 * - Model availability checking
 * - Automatic fallback to defaults when models not found
 */

export class AiModels {

    constructor() {
        this.config = null;
        this.defaults = null;
        this.initialized = false;
        this.initPromise = this.loadConfig();
    }

    async loadConfig() {
        /**
         * Load the AI models configuration from aiModels.json
         * Uses lab_api.v1.config if available, otherwise fetches directly
         */
        try {
            // Try to get from lab_api config system first (if available)
            if (typeof lab_api !== 'undefined' && lab_api?.v1?.config?.get) {
                const config = lab_api.v1.config.get('aiModels');
                if (config) {
                    this.config = config;
                    this.defaults = this.config.defaults;
                    this.initialized = true;
                    return;
                }
            }

            // Fallback: fetch the JSON file directly
            const response = await fetch('/view-resources/baseview/config/edit/v2/aiModels.json');
            if (!response.ok) {
                throw new Error(`Failed to load aiModels.json: ${response.statusText}`);
            }
            this.config = await response.json();
            this.defaults = this.config.defaults;
            this.initialized = true;
        } catch (error) {
            // Provide minimal fallback config
            this.config = {
                defaults: { text: 'openAi-gpt-5-4', image: 'openAi-gpt-5-4' },
                models: { text: {}, image: {} }
            };
            this.defaults = this.config.defaults;
            this.initialized = true;
        }
    }

    async ensureInitialized() {
        /**
         * Ensure the config is loaded before using any methods
         */
        if (!this.initialized) {
            await this.initPromise;
        }
    }

    /**
     * Get all available models for a specific capability (text or image)
     * @param {string} capability - 'text' or 'image'
     * @returns {Object} Available models for the capability
     */
    getModelsByCapability(capability) {
        if (!this.initialized || !this.config) {
            return {};
        }
        if (!this.config.models[capability]) {
            return {};
        }
        return this.config.models[capability];
    }

    /**
     * Get all text models
     * @returns {Object} All text models
     */
    getTextModels() {
        return this.getModelsByCapability('text');
    }

    /**
     * Get all image models
     * @returns {Object} All image models
     */
    getImageModels() {
        return this.getModelsByCapability('image');
    }

    /**
     * Get default model for a capability
     * @param {string} capability - 'text' or 'image'
     * @returns {string} Default model ID
     */
    getDefaultModel(capability) {
        return this.defaults[capability] || this.defaults.text;
    }

    /**
     * Get model configuration by ID
     * @param {string} modelId - The model ID
     * @param {string} capability - Optional capability to search in
     * @returns {Object|null} Model configuration or null if not found
     */
    getModelById(modelId, capability = null) {
        if (capability) {
            return this.config.models[capability]?.[modelId] || null;
        }

        // Search in both text and image models
        for (const cap of ['text', 'image']) {
            const model = this.config.models[cap]?.[modelId];
            if (model) {
                return model;
            }
        }
        return null;
    }

    /**
     * Resolve a model ID, using default if not found
     * @param {string} modelId - The model ID to resolve
     * @param {string} capability - Optional capability context
     * @param {string} preferredFallback - Optional preferred fallback model ID (e.g., customer's global default)
     * @returns {Object} Object with resolved model ID and info
     */
    resolveModel(modelId, capability = 'text', preferredFallback = null) {
        if (!modelId) {
            const defaultId = preferredFallback || this.getDefaultModel(capability);
            return {
                modelId: defaultId,
                model: this.getModelById(defaultId, capability),
                originalModelId: null
            };
        }

        // Check if model exists
        const model = this.getModelById(modelId, capability);
        if (!model) {
            // Use preferred fallback if provided, otherwise use system default
            const defaultId = preferredFallback || this.getDefaultModel(capability);
            return {
                modelId: defaultId,
                model: this.getModelById(defaultId, capability),
                originalModelId: modelId,
                notFound: true
            };
        }

        return {
            modelId,
            model,
            originalModelId: null
        };
    }

    /**
     * Get model options formatted for admin dropdown
     * @param {string} capability - 'text' or 'image'
     * @returns {Array} Array of options with value and label
     */
    getModelOptionsForAdmin(capability) {
        const models = this.getModelsByCapability(capability);
        return Object.entries(models).map(([key, model]) => ({
            value: key,
            label: model.label
        }));
    }

    /**
     * Get model configuration compatible with promptInstructions aiProvider format
     * @param {string} modelId - The model ID
     * @returns {Object} Model configuration in aiProvider format
     */
    getProviderConfig(modelId) {
        const resolved = this.resolveModel(modelId);
        if (!resolved.model) {
            return null;
        }

        return {
            label: resolved.model.label,
            provider: resolved.model.provider,
            model: resolved.model.model,
            integration: resolved.model.integration,
            serviceType: resolved.model.serviceType
        };
    }
}

export default AiModels;
