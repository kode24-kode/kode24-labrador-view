if (!window.Dac.InfinityScrollAds) window.Dac.InfinityScrollAds = {};

window.Dac.InfinityScrollAds = class {

    constructor(articleId) {
        this.articleId = articleId;
    }

    reloadSkyscraperAds() {
        const skyscraperViewportLimit = 1315;
        const skyscraperVisible = window.innerWidth > skyscraperViewportLimit;
        const tags = this.getTags(this.articleId);
        const tagsArray = tags.split(',');
        const context = this.getPageType(this.articleId);
        const section = this.getSection(this.articleId);

        const event = new CustomEvent('skyscrapersReloading', {
            detail: {
                articleId: this.articleId,
                skyscraperVisible,
                tags,
                context,
                section
            }
        });
        document.dispatchEvent(event);

        if (!skyscraperVisible || (window.lab_ads && window.lab_ads.disableSkyscraperReload)) {
            return;
        }

        const placementRight = document.querySelector(
            '.placement-right > div > .adunit'
        );
        const placementLeft = document.querySelector(
            '.placement-left > div > .adunit'
        );
        if (!placementRight || !placementLeft) {
            return;
        }

        window.lwhb.cmd.push(() => {
            window.lwhb.removeAdUnit(placementLeft.id);
            window.lwhb.removeAdUnit(placementRight.id);

            const contextAndSection = `context_${ context }_section_${ section }`;
            const ortb2 = {
                ext: {
                    data: {
                        tags: tagsArray,
                        contextAndSection,
                        context,
                        section
                    }
                }
            };

            window.lwhb.loadAd({
                tagId: placementLeft.id,
                keywords: {
                    tags,
                    contextAndSection,
                    context,
                    section
                },
                ortb2
            });

            window.lwhb.loadAd({
                tagId: placementRight.id,
                keywords: {
                    tags,
                    contextAndSection,
                    context,
                    section
                },
                ortb2
            });
        });
    }

    updateAdPlacements() {
        // find all sections with main-{article id} and add the article id in the parent section divs id main-{articleId}
        const infiniteArticles = document.querySelectorAll(
            'div[id^="infiniteArticle-"]:not(.adUnitUpdated)'
        );
        infiniteArticles.forEach((infiniteArticle) => {
            const articleIdMatch = infiniteArticle.id.match(
                /infiniteArticle-(\d+)/
            );
            if (articleIdMatch) {
                infiniteArticle.classList.add('adUnitUpdated');
                const articleId = articleIdMatch[1];
                const adDivs = infiniteArticle.querySelectorAll('.adunit');
                // find all infiniteArticles with class "adunit"
                adDivs.forEach((adDiv) => {
                    if (
                        !(
                            adDiv.id.endsWith(`_${ articleId }`)
                            || infiniteArticle.id.endsWith(`_/_\d+$/`)
                        )
                    ) {
                        adDiv.id = `${ adDiv.id }_${ articleId }`;
                    }
                });
            }
        });
    }

    reloadArticleAds() {
        const infiniteArticles = document.querySelectorAll(
            `div[id^="infiniteArticle-"]`
        );
        const adUnits = [];
        infiniteArticles.forEach((article) => {
            const adDivs = article.querySelectorAll('.adunit');
            adDivs.forEach((adDiv) => adUnits.push(adDiv));
        });

        adUnits.forEach((adunit) => {
            // if it end with current article id
            if (adunit.id.endsWith(`_${ this.articleId }`)) {
                const tags = this.getTags(this.articleId);
                const tagsArray = tags.split(',');
                const contextAndSection = `context_${ this.getPageType(this.articleId) }_section_${ this.getSection(this.articleId) }`;
                const context = this.getPageType(this.articleId);
                const section = this.getSection(this.articleId);
                window.lwhb.cmd.push(() => {
                    window.lwhb.loadAd({
                        adUnitName: adunit.id.replace(`_${ this.articleId }`, ''),
                        tagId: adunit.id,
                        ignoreVisibility: true,
                        keywords: {
                            tags,
                            contextAndSection,
                            context,
                            section
                        },
                        ortb2: {
                            ext: {
                                data: {
                                    tags: tagsArray,
                                    contextAndSection,
                                    context,
                                    section
                                }
                            }
                        }
                    });
                });
            }
        });
    }

    getTags(articleId) {
        if (!window.lab_article_data || !window.lab_article_data[articleId]) {
            return '';
        }
        const { tagsString } = window.lab_article_data[articleId];
        return tagsString;
    }

    getPageType(articleId) {
        if (!window.lab_article_data || !window.lab_article_data[articleId]) {
            return '';
        }
        const { pageType } = window.lab_article_data[articleId];
        return pageType;
    }

    getSection(articleId) {
        if (!window.lab_article_data || !window.lab_article_data[articleId]) {
            return '';
        }
        const { section } = window.lab_article_data[articleId];
        return section;
    }

};
