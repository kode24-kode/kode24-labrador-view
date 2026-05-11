/**
 * Pure-function helpers for composing gallery-page SEO and SoMe title and
 * description. No DOM, no lab_api at module scope — all inputs passed in,
 * so these are unit-testable without a full editor environment.
 */
export class GallerySeoHelper {

    /**
     * Compose the meta (SEO) title for a gallery page.
     *
     * Fallback chain:
     *   1. `{articleTitle} — {galleryLabel}` when there's a parent article
     *   2. articleTitle alone (no label available)
     *   3. slideshowTitle
     *   4. galleryLabel
     * Then appended with ` | {siteName}` (unless the content already ends with it).
     *
     * @param {Object} input
     * @param {string} [input.articleTitle]       Parent article title, if any.
     * @param {string} [input.slideshowTitle]     Slideshow's own title.
     * @param {string} [input.galleryLabel]       Localized "Gallery".
     * @param {string} [input.siteName]           site.display_name.
     * @returns {string}
     */
    static composeTitle({
        articleTitle, slideshowTitle, galleryLabel, siteName
    }) {
        // Trim candidates first — a whitespace-only value (e.g. "   ") is
        // effectively empty for SEO purposes and should fall through the
        // chain rather than short-circuit.
        const article = (articleTitle || '').trim();
        const slide   = (slideshowTitle || '').trim();
        const label   = (galleryLabel || '').trim();

        let content;
        if (article && label) {
            content = `${ article } — ${ label }`;
        } else if (article) {
            content = article;
        } else if (slide) {
            content = slide;
        } else {
            content = label;
        }
        return this.withSite(content, siteName);
    }

    /**
     * Compose the social-share (SoMe) title for a gallery page. Prefers the
     * slideshow's own title because an author who named the slideshow did so
     * intentionally for this gallery; falls through to the article's curated
     * SoMe title, then article title, then the localized gallery label.
     *
     * Fallback chain:
     *   1. slideshowTitle       (author-picked for this gallery)
     *   2. parentSomeTitle      (article's SoMe title)
     *   3. parentTitle          (article's main title)
     *   4. galleryLabel
     * Then appended with ` | {siteName}`.
     *
     * @param {Object} input
     * @param {string} [input.slideshowTitle]
     * @param {string} [input.parentSomeTitle]
     * @param {string} [input.parentTitle]
     * @param {string} [input.galleryLabel]
     * @param {string} [input.siteName]
     * @returns {string}
     */
    static composeSomeTitle({
        slideshowTitle, parentSomeTitle, parentTitle, galleryLabel, siteName
    }) {
        const slide     = (slideshowTitle || '').trim();
        const parentSom = (parentSomeTitle || '').trim();
        const parent    = (parentTitle || '').trim();
        const label     = (galleryLabel || '').trim();

        let content;
        if (slide)          { content = slide; }
        else if (parentSom) { content = parentSom; }
        else if (parent)    { content = parent; }
        else                { content = label; }
        return this.withSite(content, siteName);
    }

    /**
     * Append ` | siteName` to content, unless content already ends with it
     * or either side is empty.
     */
    static withSite(content, siteName) {
        const c = (content || '').trim();
        const s = (siteName || '').trim();
        if (!c) { return s; }
        if (!s) { return c; }
        // Match the full " | siteName" delimiter rather than a raw suffix —
        // a title like "MySite" shouldn't be treated as already suffixed
        // with siteName "Site".
        const delim = ` | ${ s }`;
        if (c.toLowerCase().endsWith(delim.toLowerCase())) { return c; }
        return `${ c } | ${ s }`;
    }

    /**
     * Compose the meta (SEO) description for a gallery page.
     *
     * Fallback chain (first non-empty wins):
     *   1. slideshowDescription
     *   2. parentSeoDescription
     *   3. localized auto-template `gallery.autoDescription` with { n, title }
     *   4. parentSubtitle
     *   5. empty string — NEVER a literal placeholder.
     *
     * The auto-template is prioritised over the parent article's subtitle
     * because the template describes the gallery itself ("N images from
     * Title") while the subtitle is about the parent article.
     *
     * @returns {string}
     */
    static composeDescription({
        slideshowDescription, parentSeoDescription, parentSubtitle,
        imageCount, articleTitle, locale
    }) {
        return this.pickDescription([
            slideshowDescription,
            parentSeoDescription,
            () => this.autoDescription({ imageCount, articleTitle, locale }),
            parentSubtitle
        ]);
    }

    /**
     * Compose the social-share (SoMe) description for a gallery page.
     *
     * Fallback chain (first non-empty wins):
     *   1. slideshowDescription
     *   2. parentSomeDescription  (article's curated SoMe description)
     *   3. parentSeoDescription
     *   4. localized auto-template `gallery.autoDescription`
     *   5. parentSubtitle
     *   6. empty string.
     *
     * @returns {string}
     */
    static composeSomeDescription({
        slideshowDescription, parentSomeDescription, parentSeoDescription,
        parentSubtitle, imageCount, articleTitle, locale
    }) {
        return this.pickDescription([
            slideshowDescription,
            parentSomeDescription,
            parentSeoDescription,
            () => this.autoDescription({ imageCount, articleTitle, locale }),
            parentSubtitle
        ]);
    }

    /**
     * Walk a list of candidates (strings or zero-arg producers) and return
     * the first non-empty trimmed+truncated value. Returns '' if none match.
     */
    static pickDescription(candidates) {
        for (const c of candidates) {
            const raw = typeof c === 'function' ? c() : c;
            const trimmed = (raw || '').trim();
            if (trimmed) {
                return this.truncate(trimmed, 160);
            }
        }
        return '';
    }

    /**
     * Render the localized auto-description template. Returns '' when the
     * inputs are insufficient or the locale key is missing / malformed.
     */
    static autoDescription({ imageCount, articleTitle, locale }) {
        if (!(imageCount > 0) || !articleTitle || !locale) { return ''; }
        const out = locale.get('gallery.autoDescription', {
            data: { n: imageCount, title: articleTitle }
        });
        const trimmed = (out || '').trim();
        // Guard against missing locale key (locale.get returns the literal key)
        // and against unresolved mustache interpolation.
        if (!trimmed) { return ''; }
        if (trimmed.startsWith('gallery.autoDescription')) { return ''; }
        if (trimmed.includes('{{')) { return ''; }
        return trimmed;
    }

    /**
     * Truncate to max chars. Prefer a word boundary if one lies within the
     * last 25% of the cut; otherwise hard-cut. Appends an ellipsis.
     */
    static truncate(s, max) {
        if (s.length <= max) { return s; }
        const cut = s.slice(0, max);
        const lastSpace = cut.lastIndexOf(' ');
        const base = lastSpace > max * 0.75 ? cut.slice(0, lastSpace) : cut;
        return `${ base.trimEnd() }…`;
    }

}
