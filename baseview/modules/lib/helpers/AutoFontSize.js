/**
 * AutoFontSize is a utility class designed to dynamically adjust font sizes and split text into parts based on specified criteria.
 * It provides functionality to ensure text fits within given constraints by adjusting font size and splitting text into even parts
 * or based on maximum word length and custom regular expressions.
 */
export class AutoFontSize {

    /**
     * Automatically sizes the text within an element based on the provided configuration.
     *
     * @param {HTMLElement} element - The element containing the text to be auto-sized.
     * @param {Object} config - The configuration object for auto-sizing the text.
     * @returns {string} - The modified HTML content of the element after auto-sizing the text.
     */
    static autoSizeText(element, config) {
        const startFontSize = {
            1: 100,
            2: 70,
            3: 50,
            4: 45,
            5: 40,
            6: 35,
            7: 30,
            8: 26,
            9: 22,
            10: 20,
            11: 18,
            12: 17,
            13: 16,
            14: 15,
            15: 14,
            16: 13,
            17: 12,
            18: 11,
            19: 10,
            20: 9,
            21: 8,
            22: 7,
            23: 6,
            24: 5,
            25: 4
        };
        const title = element.innerHTML.replace(/&nbsp;/, '');
        if (element.querySelector('br') || element.querySelector('.auto-font-size-line-br')) {
            const titleLines = this.handleBreaks(title);
            element.innerHTML = ''; // eslint-disable-line no-param-reassign
            titleLines.forEach((line, index) => {
                element.innerHTML += `<span class="auto-font-size-line${ index < titleLines.length ? ' auto-font-size-line-br' : '' }">${ line } </span>`;  // eslint-disable-line no-param-reassign
            });
        } else {
            const titleWithSpaces = this.removeHTMLTags(title);
            const titleLines = this.splitSentence(titleWithSpaces, config, 'default');
            element.innerHTML = '';  // eslint-disable-line no-param-reassign
            for (const line of titleLines) {
                element.innerHTML += `<span class="auto-font-size-line">${ line } </span>`;  // eslint-disable-line no-param-reassign
            }
        }

        const titleSpans = element.querySelectorAll('.auto-font-size-line');
        const maxTitleWidth = element.clientWidth;

        for (const span of titleSpans) {
            const stringLength = span.innerText.length;
            const fontSize = startFontSize[stringLength] || 5;
            if (span.clientWidth < maxTitleWidth) {
                this.enlargeTitle(span, maxTitleWidth, fontSize);
            } else if (span.clientWidth > maxTitleWidth) {
                this.shrinkTitle(span, maxTitleWidth, fontSize);
            }
        }

        return element.innerHTML;
    }

    /**
     * Splits a title into lines based on HTML line breaks.
     *
     * @param {string} title - The title to be processed.
     * @returns {string[]} An array of lines from the title.
     */
    static handleBreaks(title) {
        const titleWithSpaces = this.removeHTMLTags(title);
        let titleLines = titleWithSpaces.split(/<br\s*[^>]*>/gi);
        titleLines = titleLines.filter((line) => line.trim().length > 0);
        return titleLines;
    }

    /**
     * Removes the font size from the innerHTML of the given element.
     * @param {HTMLElement} element - The element from which to remove the font size.
     */
    static removeFontSize(element) {
        const title = element.innerHTML;
        return this.removeHTMLTags(title);
        // return element.innerHTML;
    }

    /**
     * Removes HTML tags from a given title.
     *
     * @param {string} title - The title containing HTML tags.
     * @returns {string} - The title with HTML tags removed.
     */
    static removeHTMLTags(title) {
        let titleWithSpaces = title.replace(/<span class="auto-font-size-hyphen">-<\/span>\s?/g, '');
        titleWithSpaces = titleWithSpaces.replace(/<span class="[^"]*\bauto-font-size-line-br\b[^"]*"[^>]*>(.*?)<\/span>/g, '$1<br>');
        titleWithSpaces = titleWithSpaces.replace(/<span class="[^"]*\bauto-font-size-line\b[^"]*"[^>]*>(.*?)<\/span>/g, '$1');
        titleWithSpaces = titleWithSpaces.replace(/<span[^>]*>([^<]*)<\/span>/g, '$1');
        titleWithSpaces = titleWithSpaces.replace(/(\r\n|\n|\r)/g, '');
        return titleWithSpaces;
    }

    /**
     * Enlarges the title by adjusting the font size until it reaches the maximum title width.
     *
     * @param {HTMLElement} title - The title element to be enlarged.
     * @param {number} maxTitleWidth - The maximum width that the title can occupy.
     * @param {number} fontSize - The initial font size of the title.
     */
    static enlargeTitle(title, maxTitleWidth, fontSize, maxFontSize = 100) {
        let newFontSize = fontSize;
        while (title.clientWidth < maxTitleWidth && newFontSize <= maxFontSize) {
            newFontSize += 1;
            title.style.setProperty('--lab-auto-font-size', `${ newFontSize }cqi`);
        }
        while (title.clientWidth >= maxTitleWidth || newFontSize > maxFontSize) {
            newFontSize -= 0.1;
            title.style.setProperty('--lab-auto-font-size', `${ newFontSize }cqi`);
        }
    }

    /**
     * Shrinks the title font size until it fits within the specified maximum width.
     *
     * @param {HTMLElement} title - The title element to shrink the font size of.
     * @param {number} maxTitleWidth - The maximum width that the title should fit within.
     * @param {number} fontSize - The initial font size of the title.
     */
    static shrinkTitle(title, maxTitleWidth, fontSize) {
        let newFontSize = fontSize;
        while (title.clientWidth > maxTitleWidth) {
            newFontSize -= 0.1;
            title.style.setProperty('--lab-auto-font-size', `${ newFontSize }cqi`);
        }
    }

    /**
     * Splits a sentence into multiple lines based on given rules and container dimensions.
     *
     * @param {string} sentence - The sentence to be split.
     * @param {object} rules - The rules to be applied for splitting the sentence.
     * @param {object} container - The container dimensions.
     * @returns {string[]} An array of lines resulting from splitting the sentence.
     */
    static splitSentence(sentence, rules, container) {
        const { length } = sentence;
        const rulesToUse = this.findRules(rules, container);
        const rangeToUse = this.findNumberOfLines(rulesToUse.ranges, length) || 1;
        const maxWordLength = rulesToUse.maxWordLength || null;
        const minLineLength = rulesToUse.minLineLength || null;
        const lines = this.splitTextEvenly(sentence, rangeToUse, maxWordLength, minLineLength, rules.regex) || [];
        return lines;
    }

    /**
     * Finds the rules to use for a given container.
     *
     * @param {object} rules - The rules object containing the formats.
     * @param {string} container - The container for which to find the rules.
     * @returns {object} - The rules to use for the given container.
     */
    static findRules(rules, container) {
        const formatRules = rules.formats[container];
        const rulesToUse = { ...formatRules };
        return rulesToUse;
    }

    /**
     * Finds the number of lines based on the given ranges and length.
     *
     * @param {Array<Object>} ranges - An array of range objects.
     * @param {number} length - The length to compare against the range's maxCharacters.
     * @returns {number} The number of lines.
     */
    static findNumberOfLines(ranges, length) {
        const rangeToUse = { maxLineLength: 20, numberOfLines: 1 };
        for (const range of ranges) {
            if (length <= range.maxCharacters) {
                rangeToUse.numberOfLines = range.numberOfLines;
                rangeToUse.maxLineLength = range.maxCharacters / range.numberOfLines;
                break;
            }
        }
        return rangeToUse;
    }

    /**
     * Replaces matches of the regex in the text with a placeholder.
     *
     * @param {Object} regex - The regular expressions to check and replace in the text.
     * @param {string} text - The input text to be processed.
     * @param {string} placeholder - The placeholder to replace matches with.
     * @returns {string} The processed text with placeholders.
     */
    static checkRegex(regex, text, placeholder) {
        let newText = text;
        const matches = [];
        const regexArray = Array.from(Object.entries(regex), ([, value]) => value);

        regexArray.forEach((rule) => {
            const expression = new RegExp(rule, 'g');
            const foundMatches = newText.match(expression);
            if (foundMatches) {
                matches.push(...foundMatches);
            }
        });

        matches.forEach((match) => {
            const replacement = match.replace(/ /g, placeholder);
            newText = newText.replace(match, replacement);
        });

        return newText;
    }

    /**
     * Splits a string into parts based on the given parameters.
     *
     * @param {string} text - The input text to be split.
     * @param {number} partSize - The maximum size of each part.
     * @param {RegExp} regex - The regular expression used to check and replace text.
     * @param {number} maxWordLength - The maximum length of each word.
     * @returns {string[]} An array of parts after splitting the input text.
     */
    static splitStringIntoParts(text, partSize, regex, maxWordLength, numberOfLines) {
        const regexPlaceholder = '___';
        const newText = this.checkRegex(regex, text, regexPlaceholder);
        const words = newText.split(' ');
        const parts = [];
        let currentPart = '';

        words.forEach((wordRaw) => {
            const word = wordRaw.trim().replace(new RegExp(regexPlaceholder, 'g'), ' ');

            if (word.includes('-')) {
                // Treat hyphenated words as a single unit
                if (currentPart.length + word.length + 1 > partSize) {
                    parts.push(currentPart);
                    currentPart = word;
                } else {
                    currentPart += (currentPart.length > 0 ? ' ' : '') + word;
                }
            } else {
                const chunks = this.splitWord(word, maxWordLength);
                chunks.forEach((chunk, chunkIndex) => {
                    if (currentPart.length + chunk.length + 1 > partSize) {
                        parts.push(currentPart);
                        currentPart = chunk;
                    } else {
                        currentPart += (currentPart.length > 0 ? ' ' : '') + chunk;
                    }
                    // Add hyphen if it's not the last chunk
                    if (chunkIndex < chunks.length - 1) {
                        currentPart += '<span class="auto-font-size-hyphen">-</span>';
                    }
                });
            }
        });

        if (currentPart.length > 0) {
            parts.push(currentPart);
        }

        return parts;
    }

    /**
     * Splits a word into chunks, adding hyphens if necessary.
     *
     * @param {string} word - The word to be split.
     * @param {number} maxWordLength - The maximum length of each chunk.
     * @returns {string[]} An array of word chunks.
     */
    static splitWord(word, maxWordLength) {
        const chunks = [];
        let remainingWord = word;

        while (remainingWord.length > maxWordLength) {
            chunks.push(remainingWord.substring(0, maxWordLength));
            remainingWord = remainingWord.substring(maxWordLength);
        }

        if (remainingWord.length > 0) {
            chunks.push(remainingWord);
        }

        return chunks;
    }

    /**
     * Splits the given text evenly into a specified number of lines, ensuring that each line
     * adheres to the maximum word length and minimum line length constraints.
     *
     * @param {string} text - The text to be split.
     * @param {Object} rangeToUse - An object containing the number of lines to split the text into.
     * @param {number} rangeToUse.numberOfLines - The number of lines to split the text into.
     * @param {number} maxWordLength - The maximum length of a word in the split text.
     * @param {number} [minLineLength] - The minimum length of a line in the split text.
     * @param {RegExp} regex - The regular expression used to split the text.
     * @returns {string[]} An array of strings, each representing a line of the split text.
     */
    static splitTextEvenly(text, rangeToUse, maxWordLength, minLineLength, regex) {
        const newText = text.trim();
        const partLength = Math.ceil(newText.length / rangeToUse.numberOfLines);
        let lines = this.splitStringIntoParts(newText, partLength, regex, maxWordLength, rangeToUse.numberOfLines);

        if (minLineLength) {
            lines = this.mergeShortLines(lines, minLineLength);
        }

        if (lines.length > rangeToUse.numberOfLines) {
            const hyphenRegex = /<span class="auto-font-size-hyphen">-<\/span>$/;
            const lastLine = lines.pop();
            if (hyphenRegex.test(lines[lines.length - 1])) {
                lines[lines.length - 1] = lines[lines.length - 1].replace(hyphenRegex, '') + lastLine;
            } else {
                lines[lines.length - 1] += ` ${ lastLine }`;
            }
        }
        return lines;
    }

    /**
     * Merges lines that are shorter than a specified minimum length with adjacent lines, including the last line.
     *
     * @param {string[]} lines - The array of split lines.
     * @param {number} minLength - The minimum length a line must have.
     * @returns {string[]} The modified array of lines where all lines meet the minimum length.
     */
    static mergeShortLines(lines, minLength) {
        const mergedLines = [];
        for (let i = 0; i < lines.length; i++) {
            let currentLine = lines[i].trim();

            if (currentLine.length < minLength && i < lines.length - 1) {
                currentLine += ` ${ lines[i + 1] }`;
                i++;
            }

            mergedLines.push(currentLine);
        }

        if (mergedLines.length > 1) {
            const lastLine = mergedLines[mergedLines.length - 1];
            if (lastLine.length < minLength) {
                mergedLines[mergedLines.length - 2] += ` ${ lastLine }`;
                mergedLines.pop();
            }
        }

        return mergedLines;
    }

}
