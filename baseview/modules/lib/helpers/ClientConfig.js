/**
 * ClientConfig
 * Get site-config and config-object that should be passed on to the client renderer.
 */

export class ClientConfig {

    static buildConfig(api) {
        return {
            viewConfig: {
                config: {
                    customer: {
                        paywall: {
                            label: lab_api.v1.config.get('paywall.label') || {}
                        },
                        image: {
                            defaultAspectRatio: lab_api.v1.config.get('image.defaultAspectRatio') || undefined
                        }
                    }
                }
            }
        };
    }

}
