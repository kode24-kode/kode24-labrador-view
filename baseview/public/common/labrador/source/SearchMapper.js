/**
 * Modify data for each article in the search result
 * Set styling and content
 */
export class SearchMapper {

    constructor(settings) {
        this.bodytextLength = settings.bodytextLength || 0;
        this.fallbackImage = settings.fallbackImage; // Define in admin: /settings/cp?page=fallback_image
        this.sites = settings.sites;
        this.layout = settings.layout || {};
        this.sitesById = {};
    }

    // (ClientData)
    map(clientData) {
        clientData.setData(
            clientData.getData().map((itm) => {
                const item = { ...itm };
                let image;
                if (item.children && item.children[0]) {
                    image = item.children[0];
                } else if (this.fallbackImage) {
                    image = {
                        type: 'image',
                        contentdata: {
                            fields: {
                                imageurl: { value: `${ this.fallbackImage }` }
                            }
                        },
                        metadata: {
                            style_preset: { value: 'fallbackImage' }
                        }
                    };
                }
                if (image) {
                    image.width = { vp: this.layout.image.width };
                    image.contentdata.fields.float = { vp: this.layout.image.float };
                    image.contentdata.fields.whRatio = { vp: this.layout.image.whRatio };
                    item.children = [image];
                }
                item.contentdata.fields.subtitle.value = this.trimBodytext(item.contentdata.fields.subtitle.value, item);
                const siteName = !this.layout.article.hideSiteName ? `<span class="sitealias label">${ this.siteIdToDisplayName(item.contentdata.fields.site_id.value) }</span>` : '';
                const publishedDate = !this.layout.article.hidePublishedDate ? `<span class="date fi-clock"> ${ this.dateToAge(item.contentdata.fields.published.value) }</span>` : '';
                const section = !this.layout.article.hideSection ? `<span class="section_tag fi-price-tag"> ${ item.contentdata.primaryTags.section }</span>` : '';
                if (siteName || publishedDate || section) {
                    item.contentdata.fields.subtitle.value += `<span class="info">${ siteName }${ publishedDate }${ section }</span>`;
                }
                item.width = { vp: this.layout.article.width };
                return item;
            })
        );
        return clientData;
    }

    trimBodytext(value, item) {
        if (value) {
            return value;
        }
        const txt = item.contentdata.fields.bodytext.value || '';
        const maxLength = this.bodytextLength;
        if (maxLength === 0) {
            return '';
        }
        if (txt.length > maxLength) {
            return `${ txt.substring(0, maxLength)  } ...`;
        }
        return txt;
    }

    siteIdToDisplayName(siteId) {
        const id = parseInt(siteId, 10);
        if (this.sitesById[siteId] === undefined) {
            this.sitesById[siteId] = (this.sites.filter((site) => site.id === id).pop() || {}).displayName;
        }
        return this.sitesById[siteId];
    }

    dateToAge(isoDateString) {
        if (!isoDateString) {
            return '';
        }
        const d = new Date(isoDateString);
        return `${ d.toLocaleDateString() } - ${ d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }`;
    }

}
