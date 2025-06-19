import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            on('task', {
                log(message) {
                    console.log(message); // Output to terminal
                    return null; // Return null to indicate task completion
                }
            });
        },
        chromeWebSecurity: false, // Allows cross-origin testing
        baseUrl: 'https://forskning--www-e2e-test.labdevs.com'
    }
});
