/**
 * Utility functions for working with terms (sections, keywords, etc.)
 */

export class TermHelper {

    /**
     * Normalizes a term name for comparison.
     * Lowercases, strips diacritics, and replaces spaces with hyphens.
     * @param {string} str
     * @returns {string}
     */
    static normalize(str) {
        return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    }

    /**
     * Fetches terms from the search endpoint.
     * @param {string} collection - Term collection (e.g. 'section')
     * @param {number} limit - Max number of terms to return (default 500)
     * @returns {Promise<Array>}
     */
    static async fetchTerms(collection, limit = 500) {
        const response = await fetch(`/ajax/term/search?collection=${encodeURIComponent(collection)}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch terms: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Finds a term in a list by matching name string (accent- and hyphen-insensitive).
     * @param {Array} terms - Array of term objects from the API
     * @param {string} name - Name to match against
     * @returns {Object|null}
     */
    static findTermByName(terms, name) {
        const normalized = TermHelper.normalize(name);
        return terms.find((term) => TermHelper.normalize(term.name) === normalized) || null;
    }

    /**
     * Returns all child terms of a given parent ID.
     * @param {Array} terms - Array of term objects from the API
     * @param {number} parentId - Parent term ID
     * @returns {Array}
     */
    static getChildTerms(terms, parentId) {
        return terms.filter((term) => term.parentId === parentId);
    }

    /**
     * Fetches term data for a list of term names in a single request.
     * @param {string} collection - Term collection (e.g. 'section')
     * @param {Array<string>} names - Array of term name strings
     * @returns {Promise<Array>} Array of matched term objects
     */
    static async fetchTermsByNames(collection, names) {
        if (!names || names.length === 0) { return []; }
        const response = await fetch(`/ajax/term/get-term?collection=${encodeURIComponent(collection)}&termName=${encodeURIComponent(names.join(','))}`);
        if (!response.ok) { return []; }
        const data = await response.json();
        // Endpoint returns a single object for one name, array for multiple
        return Array.isArray(data) ? data : [data];
    }

}
