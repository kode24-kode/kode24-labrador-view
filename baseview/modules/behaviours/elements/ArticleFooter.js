export default class ArticleFooter {

    constructor(api) {
        this.api = api;
        this.ignoredTags = this.api.v1.config.get('page_settings.article.ignoredTags') || [];
        this.ignoredTagPrefix = this.api.v1.config.get('page_settings.article.ignoredTagPrefix') || [];
        this.adminIgnoredTags = !this.api.v1.config.get('showHiddenTagsOnArticle') ? (this.api.v1.config.get('tagsToHide') || '').split(',').map((tag) => tag.trim()) : [];

        // Term compatibility: Load term configs from properties (exposed from PHP)
        // These are cached in constructor for performance (avoid repeated lookups in onRender)
        this.tagsAsTermsConfig = this.api.v1.properties.get('tags_as_terms');
        this.termCollectionConfig = this.api.v1.properties.get('tag_term_collection') || 'keyword';
        this.tagPagePathConfig = this.api.v1.config.get('tagPagePath') || '/tag/';
    }

    onRender(model, view) {
        const allIgnoredTags = [...new Set([...this.ignoredTags, ...this.adminIgnoredTags])];
        const rootModel = this.api.v1.model.query.getRootModel();

        // Get regular tags (keep as strings for backward compatibility)
        const tags = (rootModel.get('tags') || [])
            .filter((tag) => !allIgnoredTags.includes(tag))
            .filter((tag) => {
                for (const prefix of this.ignoredTagPrefix) {
                    if (tag.startsWith(prefix)) {
                        return false;
                    }
                }
                return true;
            });

        // Term compatibility: Provide rich term objects when tags_as_terms is enabled
        // (includes displayName, uriPath for proper display and hierarchical URLs)
        const tagsAsTerms = this.tagsAsTermsConfig;
        const termCollection = this.termCollectionConfig;
        const terms = rootModel.get('term');
        const mainterm = rootModel.get('mainterm');

        // Build termData if terms are enabled and we have at least one source of term data
        const hasTerms = tagsAsTerms && (
            (terms && (terms[termCollection] || terms.section)) ||
            (mainterm && mainterm.section)
        );

        let termData = null;
        if (hasTerms) {
            termData = [];

            // Term compatibility: Add mainterm (section) first for proper display order
            if (mainterm && mainterm.section) {
                const sectionTerm = mainterm.section;
                // Skip hidden terms and ignored tags
                if (!allIgnoredTags.includes(sectionTerm.name) && !sectionTerm.hidden) {
                    termData.push({
                        name: sectionTerm.name || '',
                        displayName: sectionTerm.displayName || sectionTerm.name || '',
                        uriPath: sectionTerm.uriPath || sectionTerm.name || '',
                        uriName: sectionTerm.uriName || sectionTerm.name || '',
                        isMainTerm: true
                    });
                }
            }

            // Term compatibility: Merge terms from both keyword and section collections
            // (both collections can contain tags, need to check both)
            const allRegularTerms = [
                ...((terms && terms[termCollection]) || []),  // keyword collection
                ...((terms && terms.section) || [])            // section collection
            ];

            // Filter and map all terms at once
            const regularTerms = allRegularTerms
                .filter((term) => !allIgnoredTags.includes(term.name))
                .filter((term) => {
                    for (const prefix of this.ignoredTagPrefix) {
                        if (term.name && term.name.startsWith(prefix)) {
                            return false;
                        }
                    }
                    return true;
                })
                // Skip hidden terms
                .filter((term) => !term.hidden)
                // Skip if already added as mainterm
                .filter((term) => {
                    if (mainterm && mainterm.section && mainterm.section.name === term.name) {
                        return false;
                    }
                    return true;
                })
                // Remove duplicates by name (in case a term appears in both collections)
                .filter((term, index, self) =>
                    index === self.findIndex((t) => t.name === term.name)
                )
                .map((term) => ({
                    name: term.name || '',
                    displayName: term.displayName || term.name || '',
                    uriPath: term.uriPath || term.name || '',
                    uriName: term.uriName || term.name || '',
                    isMainTerm: false
                }));

            termData = termData.concat(regularTerms);
        }

        // Set both for backward compatibility and new functionality
        const tagPagePath = this.tagPagePathConfig;
        model.setFiltered('tags', tags);              // Strings (backward compatible)
        model.setFiltered('termData', termData);      // Rich objects (new)
        model.setFiltered('tagPagePath', tagPagePath);
    }

}
