export class LanguageHelper {

    static convertToIso639(language) {
        /**
         * Convert language code to ISO 639 code (two or three letter code) for news sitemap
         */
        let languageIso639Code = '';
        if (language) {
            // Accept tree letter language codes
            if (language.length === 3) {
                languageIso639Code = language.toLowerCase();
            } else if (language.includes('-')) {
                languageIso639Code = language.split('-')[0].toLowerCase();
            } else {
                languageIso639Code = language.toLowerCase();
            }
        }
        return languageIso639Code;
    }

}
