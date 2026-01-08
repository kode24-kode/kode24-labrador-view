/**
 * Client API for emitting events and registering listeners.
 * See 'docs/readme/readme-client-api.md' for more info.
 */

export class ClientAPI {

    constructor({ pageData, debug } = {}) {
        this.pageData = pageData;
        this.debug = !!debug;
        this.data = {}; // Arbitrary data storage
        this.log('Initializing ClientAPI ...');
        this.events = [
            'pageChanged',      // Log statistics based on supported integrations, reload ads etc.
            'galleryLoaded',    // Triggered when a gallery page is loaded
            'accessGranted',    // Do DOM modifications based on supported integrations
            'accessDenied'      // Handle access denial based on supported integrations
        ];
        this.eventListeners = {}; // { event: [callback1, callback2, ...] }
    }

    log(...args) {
        if (this.debug) {
            // eslint-disable-next-line no-console
            console.log('[ClientAPI]', ...args);
        }
    }

    on(event, callback) {
        if (!this.events.includes(event)) {
            throw new Error(`Event "${ event }" is not supported. Listener not added.`);
        }
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        this.log('Listener registered for event:', event);
    }

    off(event, callback) {
        if (!this.events.includes(event)) {
            throw new Error(`Event "${ event }" is not supported. Listener not removed.`);
        }
        if (!this.eventListeners[event]) {
            return; // No listeners to remove
        }
        this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
        this.log('Listener removed for event:', event);
    }

    emit(event, data) {
        if (!this.events.includes(event)) {
            throw new Error(`Event "${ event }" is not supported. Listeners not notified.`);
        }
        if (!this.eventListeners[event]) {
            return; // No listeners to notify
        }
        this.log('Will emit event:', event);
        this.eventListeners[event].forEach((callback) => {
            callback({ event, data, pageData: this.pageData });
        });
    }

    getPageData() {
        return this.pageData;
    }

    set(key, value) {
        this.data[key] = value;
    }

    get(key) {
        return this.data[key];
    }

}
