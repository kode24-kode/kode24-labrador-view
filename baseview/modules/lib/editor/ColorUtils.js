export class ColorUtils {

    /**
     * Convert a hex color to RGB
     * @param {String} hexColor Input color in HEX format (e.g. #ff0000 or ff0000)
     * @returns {Array} RGB color array (e.g. [255, 0, 0])
     */
    static hex2rgb(hexColor) {
        let color = typeof hexColor === 'string' ? hexColor.trim() : '';
        if (!color.startsWith('#')) {
            color = `#${ color }`;
        }
        return [
            parseInt(color.slice(1, 3), 16),
            parseInt(color.slice(3, 5), 16),
            parseInt(color.slice(5, 7), 16)
        ];
    }

    static rgbString2hex(rgbString) {
        if (typeof rgbString !== 'string') {
            return rgbString;
        }
        const rgbArray = rgbString.match(/\d+/g);
        if (!rgbArray || rgbArray.length !== 3) {
            return rgbString;
        }
        // eslint-disable-next-line no-bitwise
        return `#${ ((1 << 24) + (parseInt(rgbArray[0], 10) << 16) + (parseInt(rgbArray[1], 10) << 8) + parseInt(rgbArray[2], 10)).toString(16).slice(1).toUpperCase() }`;
    }

    /**
     * Get color brightness
     * @param {Array} rgbArray Input-color in RGB format
     * @returns {Integer} Brightness value from 0 (dark) to 255 (light), null on error
     */
    static getBrightness(rgbArray) {
        if (!Array.isArray(rgbArray) || rgbArray.length !== 3) {
            return null;
        }
        return parseInt(((rgbArray[0] * 299) + (rgbArray[1] * 587) + (rgbArray[2] * 114)) / 1000, 10);
    }

}
