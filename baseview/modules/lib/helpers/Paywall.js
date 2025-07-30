export class Paywall {

    static defaultLineIndex = 3;

    // Paywall-mode. Render for users without access
    // - Only include a configured number of bodytext-lines
    // - Omit all elements inside the bodytext
    static filterBodytext(model, view) {
        let lineIndex = lab_api.v1.config.get('paywall.bodytext.lineCount');
        if (lineIndex === null || lineIndex === false) {
            lineIndex = this.defaultLineIndex;
        }
        const lineData = model.get('filtered.lineData');
        let { bodytext } = lineData;
        const indexRegister = lineData.indexRegister.reverse();
        if (indexRegister.length <= lineIndex) {
            lineIndex = indexRegister.length - 1;
        }
        if (indexRegister[lineIndex]) {
            bodytext = bodytext.substring(0, indexRegister[lineIndex].charIndex);
        }
        return bodytext;
    }

    static iterasPaywall(config, tags) {
        const paywallConfig = {
            id: config.id,
            offersTitle: config.offersTitle,
            alreadySubscribedText: config.alreadySubscribedText,
            alreadySubscribedLink: config.alreadySubscribedLink,
            offers: config.offers,
            offerButtonLink: config.offerButtonLink,
            offerButtonText: config.offerButtonText,
            offersSalesText: config.offersSalesText
        };

        const extraPaywall = config.extraPaywalls.find((paywall) => tags.includes(paywall.triggerTag)) || null;
        if (extraPaywall) {
            paywallConfig.id = extraPaywall.id;
            paywallConfig.offersTitle = extraPaywall.offersTitle;
            paywallConfig.alreadySubscribedText = extraPaywall.alreadySubscribedText;
            paywallConfig.alreadySubscribedLink = extraPaywall.alreadySubscribedLink;
            paywallConfig.offers = extraPaywall.offers;
            paywallConfig.offerButtonLink = extraPaywall.offerButtonLink;
            paywallConfig.offerButtonText = extraPaywall.offerButtonText;
            paywallConfig.offersSalesText = extraPaywall.offersSalesText;
        }
        return paywallConfig;
    }

}
