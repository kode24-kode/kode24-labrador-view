export default class Recipe {

    constructor(api) {
        this.api = api;
        this.isEditor = this.api.v1.app.mode.isEditor();
        if (this.isEditor) {
            this.api.v1.ns.set('recipe.insertIngredients', (model, view, menuItem, params) => {
                this.addRecipeIngredients(model);
            });
            this.api.v1.ns.set('recipe.insertInstructions', (model, view, menuItem, params) => {
                this.addRecipeInstructions(model);
            });
        }
    }

    onRender(model, view) {
        const rootModel = this.api.v1.model.query.getRootModel();
        const name = model.get('fields.name') || '';
        const recipeIngredientsModel = this.api.v1.model.query.getChildOfType(model, 'recipeIngredients');
        const recipeInstructionsModel = this.api.v1.model.query.getChildOfType(model, 'recipeInstructions');
        const recipeIngredientsHtml = recipeIngredientsModel ? recipeIngredientsModel.get('fields.bodytext') : '';
        const recipeInstructionsHtml = recipeInstructionsModel ? recipeInstructionsModel.get('fields.bodytext') : '';
        const bylineNames = [];
        const isFrontPage = rootModel.getType() === 'page_front';
        if (!isFrontPage) {
            const bylines = this.api.v1.model.query.getChildrenOfType(rootModel, 'byline', true);
            if (bylines) {
                bylines.forEach((byline) => {
                    const bylineName = `${ byline.get('fields.firstname') } ${ byline.get('fields.lastname') }`.trim();
                    if (bylineName) {
                        bylineNames.push(bylineName);
                    }
                });
            }
        }

        if (this.isEditor && !model.get('fields.author') && bylineNames.length) {
            model.set('fields.author', bylineNames.join(', '));
        }

        const authorField = model.get('fields.author') || bylineNames.join(', ');
        const authorNames = authorField.split(',').map(n => n.trim()).filter(Boolean);
        let authorJson;
        if (authorNames.length === 0) {
            authorJson = 'null';
        } else if (authorNames.length === 1) {
            authorJson = JSON.stringify({ '@type': 'Person', name: authorNames[0] });
        } else {
            authorJson = JSON.stringify(authorNames.map(name => ({ '@type': 'Person', name })));
        }

        let keywords = model.get('fields.keywords') || '';
        if (keywords) {
            keywords = keywords.split(',').map(v => v.trim()).filter(Boolean)
        }

        model.setFiltered('keywords', JSON.stringify(keywords));
        if (recipeIngredientsHtml) {
            model.setFiltered('recipeIngredients', JSON.stringify(this.extractIngredientsFromHtml(recipeIngredientsHtml)));
        }
        if (recipeInstructionsHtml) {
            model.setFiltered('recipeInstructions', JSON.stringify(this.extractInstructionsFromHtml(recipeInstructionsHtml, name)));
        }
        model.setFiltered('author', authorJson);

        // Get image child if exists
        const imageModel = this.api.v1.model.query.getChildOfType(model, 'image');
        if (imageModel) {
            const imageUrl = imageModel.get('fields.guid');
            if (imageUrl) {
                // Set image URL for Schema.org JSON-LD
                model.setFiltered('imageUrl', imageUrl);
            }
        }

        // Set ISO 8601 duration format for total time, prep time, and cook time.
        const recipeTotalTime = model.get('fields.totalTime') || '';
        const recipePrepTime = model.get('fields.prepTime') || '';
        const recipeCookTime = model.get('fields.prepTime') || '';
        if (recipeTotalTime) {
            model.setFiltered('isoTime.totalTime', this.convertToISO8601Duration(recipeTotalTime));
        }
        if (recipePrepTime) {
            model.setFiltered('isoTime.prepTime', this.convertToISO8601Duration(recipePrepTime));
        }
        if (recipeCookTime) {
            model.setFiltered('isoTime.cookTime', this.convertToISO8601Duration(recipeCookTime));
        }
        // calculate cook time if we don't have the cook time at hand
        else if (recipeTotalTime && recipePrepTime) {
            model.setFiltered('isoTime.cookTime', this.iso8601DurationDifference(this.convertToISO8601Duration(recipeTotalTime), this.convertToISO8601Duration(recipePrepTime)));
        }
    }

    /**
     * Helper-functions for recipe
     */

    addRecipeIngredients(model) {
        const child = this.api.v1.model.create.view({
            type: 'recipeIngredients',
            contentdata: {
                fields: {
                    title: ''
                }
            }
        });
        this.api.v1.model.addChild(model, child);
    }

    addRecipeInstructions(model) {
        const child = this.api.v1.model.create.view({
            type: 'recipeInstructions',
            contentdata: {
                fields: {
                    title: ''
                }
            }
        });
        this.api.v1.model.addChild(model, child);
    }

    /**
     * Converts a time duration string to ISO 8601 duration format.
     *
     * @param {string} input - The time duration string to convert.
     * @returns {string} The converted time duration in ISO 8601 format.
     */
    convertToISO8601Duration(input) {
        const hoursRegex = /(\d+)\s*(?:time|timer|hour|hours|horas)/i;
        const minutesRegex = /(\d+)\s*(?:minut|minutter|minut|minutes|mins|min|minutos)/i;
        const hoursMatch = input.match(hoursRegex);
        const minutesMatch = input.match(minutesRegex);
        let hours = 0;
        let minutes = 0;
        if (hoursMatch) {
            hours = parseInt(hoursMatch[1], 10);
        }

        if (minutesMatch) {
            minutes = parseInt(minutesMatch[1], 10);
        }

        if (!hoursMatch && !minutesMatch) {
            return input; // Return the original input if no valid time duration is found
        }

        let isoDuration = 'PT';
        if (hours > 0) {
            isoDuration += `${ hours }H`;
        }
        if (minutes > 0) {
            isoDuration += `${ minutes }M`;
        }

        return isoDuration;
    }

    /**
     * Calculates the difference between two ISO 8601 durations and returns the result in ISO 8601 format.
     *
     * @param {string} duration1 - The first ISO 8601 duration.
     * @param {string} duration2 - The second ISO 8601 duration.
     * @returns {string} The difference between the two durations in ISO 8601 format.
     */
    iso8601DurationDifference(duration1, duration2) {
        const time1 = this.parseDuration(duration1);
        const time2 = this.parseDuration(duration2);
        const totalMinutes1 = time1.hours * 60 + time1.minutes;
        const totalMinutes2 = time2.hours * 60 + time2.minutes;
        const diffMinutes = totalMinutes1 - totalMinutes2;

        if (diffMinutes < 0) {
            return 'PT0M';
        }

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        let result = 'PT';
        if (hours > 0) {
            result += `${ hours }H`;
        }
        if (minutes > 0 || hours === 0) {
            result += `${ minutes }M`;
        }

        return result;
    }

    /**
     * Function to parse an ISO 8601 duration string into hours and minute.
     *
     * @param {string} duration - The duration string in the format ISO 8601 duration format (PT1H15M).
     * @returns {Object} - An object with the parsed hours and minutes.
     */
    parseDuration(duration) {
        const hoursMatch = duration.match(/(\d+)H/);
        const minutesMatch = duration.match(/(\d+)M/);

        const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

        return { hours, minutes };
    }

    /**
     * Extracts ingredients from an HTML string.
     *
     * @param {string} htmlString - The HTML string to extract ingredients from.
     * @returns {Array} - An array of ingredients extracted from the HTML string, either as plain strings or PropertyValue objects.
     */
    extractIngredientsFromHtml(htmlString) {
        const ingredients = [];

        // Regular expression to match both <ul> and <ol> content
        const listRegex = /<(ul|ol)\b[^>]*>(.*?)<\/\1>/gs;
        let match;

        // Check for <ul> or <ol> tags first
        if ((match = listRegex.exec(htmlString)) !== null) {
            do {
                const listContent = match[2]; // The content inside the <ul> or <ol>
                const listItems = listContent.match(/<li>(.*?)<\/li>/g);

                if (listItems) {
                    listItems.forEach((item) => {
                        const text = item.replace(/<\/?li>/g, '').trim();
                        ingredients.push(this.parseIngredient(text));
                    });
                }
            } while ((match = listRegex.exec(htmlString)) !== null);
        } else {
            // If no <ul> or <ol> tags are found, fall back to <p> tags
            const paragraphRegex = /<p>(.*?)<\/p>/gs;
            while ((match = paragraphRegex.exec(htmlString)) !== null) {
                const text = match[1].trim();
                if (text) {
                    ingredients.push(this.parseIngredient(text));
                }
            }
        }

        return ingredients;
    }

    /**
     * Parses an ingredient string to extract amount and name.
     *
     * @param {string} text - The ingredient text to parse.
     * @returns {Object|string} - Either a PropertyValue object with value and name, or the original string.
     */
    parseIngredient(text) {
        // Regex to match amount at the beginning (numbers, fractions, ranges, or "or" expressions)
        // Examples: "3", "1/2", "3/4", "1-2", "3 or 4", "1 1/2"
        const amountRegex = /^([\d\/\-\s]+(?:\s+or\s+[\d\/\-\s]+)?)\s+(.+)$/i;
        const match = text.match(amountRegex);

        if (match) {
            const value = match[1].trim();
            const name = match[2].trim();
            return {
                '@type': 'PropertyValue',
                value: value,
                name: name
            };
        } else {
            // No amount found, check if it looks like it might need PropertyValue format anyway
            // If it contains common ingredient terms, return as PropertyValue with empty value
            return {
                '@type': 'PropertyValue',
                value: '',
                name: text
            };
        }
    }

    /**
     * Extracts methods from an HTML string and returns them as an array of objects.
     *
     * @param {string} htmlString - The HTML string to extract methods from.
     * @param {string} defaultSectionName - The default section name to use if no heading is found.
     * @returns {Array} An array of method objects.
     */
    extractInstructionsFromHtml(htmlString, defaultSectionName) {
        const methods = [];
        const listRegex = /<(ul|ol)\b[^>]*>(.*?)<\/\1>/gs;
        const paragraphRegex = /<p>(.*?)<\/p>/gs;
        let match;

        // Function to find the preceding <h2>, <h3>, or <h4>
        function findHeadingBefore(matchIndex) {
            const headingRegex = /<(h2|h3|h4)>(.*?)<\/\1>/g;
            let lastHeading = null;
            let headingMatch;

            while ((headingMatch = headingRegex.exec(htmlString)) !== null) {
                if (headingMatch.index < matchIndex) {
                    lastHeading = headingMatch[2].trim();
                } else {
                    break;
                }
            }

            return lastHeading || defaultSectionName;
        }

        // Process <ul> or <ol> lists
        while ((match = listRegex.exec(htmlString)) !== null) {
            const listContent = match[2]; // The content inside the <ul> or <ol>
            const listItems = listContent.match(/<li>(.*?)<\/li>/g);
            const sectionName = findHeadingBefore(match.index);

            const steps = [];
            if (listItems) {
                listItems.forEach((item, index) => {
                    const step = item.replace(/<\/?li>/g, '').trim();
                    steps.push({
                        '@type': 'HowToStep',
                        position: index + 1,
                        text: step
                    });
                });
            }

            methods.push({
                '@type': 'HowToSection',
                name: sectionName,
                itemListElement: steps
            });
        }

        // If no <ul> or <ol> tags are found, fall back to <p> tags
        if (methods.length === 0) {
            const steps = [];
            let paragraphMatch;
            const sectionName = findHeadingBefore(htmlString.length); // Use the last found heading
            let position = 1;

            while ((paragraphMatch = paragraphRegex.exec(htmlString)) !== null) {
                const text = paragraphMatch[1].trim();
                if (text) {
                    steps.push({
                        '@type': 'HowToStep',
                        position: position++,
                        text: text
                    });
                }
            }

            if (steps.length > 0) {
                methods.push({
                    '@type': 'HowToSection',
                    name: sectionName,
                    itemListElement: steps
                });
            }
        }

        return methods;
    }

}
