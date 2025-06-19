import { expect, assert } from 'chai';
import mustache from 'mustache';

import { Core } from '../public/common/labrador/Core.js';
import { behaviours as baseviewBehaviours, Entry } from '../build/modules/client_modules.js';
import { config, properties, templates } from '../build/modules/client_package.js';


global.Mustache = mustache;
global.Sys = {
    logger: console // console, nullLogger, new Logger('main')
};

// Presentation or editor/edit

// Javascript modules
const behaviours = {};

// Multiview: Add entries from subsequent views to the entries-array
const entries = [Entry];

for (const key of Object.keys(baseviewBehaviours)) {
    // Multiview: Add behaviours from subsequent views to the behaviours[key]-array
    behaviours[key] = [baseviewBehaviours[key]];
}

// Add customer configuration without overwriting existing config
/* 
config["customer"] = {
    ...config["customer"],
    grid: {
        grid_prefix: {
            mobile: 'small-',
            tablet: 'medium-',
            desktop: 'large-'
        },
        abs_grid_prefix: {
            mobile: 'small-abs-',
            tablet: 'medium-abs-',
            desktop: 'large-abs-'
        }
    }
};
*/

const renderer = new Core({
    logger: console,
    settings: {
        siteAlias: 'lbrdr',
        device: 'desktop',
        transform: false
    },
    resources: {
        config: {
            site: {
                alias: 'lbrd',
                display_name: 'Labrador TEST MARKUP',
                domain: 'labrador.test',
                id: '123'
            },
            image_server: 'image.labrador.test',
            app: {
                mode: 'presentation'
            },
            customer: config
        },
        templates: {
            view: templates
        },
        properties,
        views: ['baseview_client_test']
    },
    globals: global,
    callbacks: {},
    entries,
    behaviours
});

// console.log(Object.keys(templates));

describe('Test element with type article', () => {
    it(`Test article teaser variables`, () => {
        renderer.setData([{
            type: 'article',
            metadata: {
                float: {
                    vp: {
                        desktop: 'floatRight'
                    }
                },
                bodyTextIndex: {
                    vp: {
                        desktop: 19
                    }
                },
                compactDisplay: {
                    value: true
                },
                image_gradient_direction: {
                    value: 'bottom'
                },
                showKicker: {
                    vp: {
                        desktop: true
                    }
                },
                hidesubtitle: {
                    vp: {
                        desktop: true
                    }
                },
                vertical_align: {
                    vp: {
                        desktop: 'start'
                    }
                }
            },
            contentdata: {
                instance_of: null,
                tags: [],
                fields: {
                    full_bylines_json: {
                        value: [],
                        vp: {},
                        attributes: {}
                    },
                    title: {
                        value: 'Tittel for artikkelteaser',
                        vp: {},
                        attributes: {
                            custom_text_color: {
                                value: null
                            },
                            text_size: {
                                vp: {
                                    desktop: 29
                                },
                                value: null
                            }
                        }
                    },
                    subtitle: {
                        value: '',
                        vp: {},
                        attributes: {}
                    },
                    kicker: {
                        value: '',
                        vp: {},
                        attributes: {
                            text_color: {
                                vp: {
                                    desktop: 'secondary'
                                },
                                value: null
                            }
                        }
                    },
                    seolanguage: {
                        vp: {},
                        attributes: {}
                    },
                    published_url: {
                        vp: {},
                        attributes: {}
                    },
                    published: {
                        vp: {},
                        attributes: {}
                    },
                    showcomments: {
                        vp: {},
                        attributes: {}
                    },
                    paywall: {
                        value: true,
                        vp: {},
                        attributes: {}
                    },
                    displayByline: {
                        value: '',
                        vp: {},
                        attributes: {}
                    },
                    section: {
                        value: 'Her er det en ny seksjon',
                        vp: {},
                        attributes: {}
                    },
                    hideAds: {
                        vp: {},
                        attributes: {}
                    },
                    site_id: {
                        value: null,
                        vp: {},
                        attributes: {}
                    },
                    site_alias: {
                        vp: {},
                        attributes: {}
                    }
                },
                id: 105538
            },
            width: {
                main: 100,
                vp: {
                    desktop: 50
                }
            },
            children: [
                {
                    type: 'image',
                    metadata: {},
                    contentdata: {
                        fields: {
                            imageCaption: {
                                value: 'Caption ...',
                                vp: {},
                                attributes: {
                                    text_size: {
                                        value: 25,
                                        vp: {
                                            desktop: 35,
                                            mobile: 18
                                        }
                                    },
                                    text_color: {
                                        value: 'red',
                                        vp: {
                                            desktop: 'blue',
                                            mobile: 'green',
                                            tablet: 'yellow'
                                        }
                                    }
                                }
                            },
                            float: {
                                vp: {
                                    desktop: 'floatRight'
                                }
                            }
                        }
                    }
                }
            ],
            guid: 'c56a84fd-49e5-4d5e-9c08-8bfad16aa729',
            selector: null,
            tmpId: null
        }]);
        const result = renderer.draw();
        // Maybe add regex-variables, we'll see
        // 1. existerer data-section?
        // 2. er data-section lik "Her er det en ny seksjon"?
        assert.match(result[0], /data-section="Her er det en ny seksjon"/, 'Check that title exists');
        
        // FEILET:
        //assert.match(result[0], /data-alias="lbrd"/, 'Check that alias exists');
        // console.log("TEST AV FLOATRIGHT");
        
        // Get article-element without children elements
        const articleElement = result[0].match(/<article[^>]*?>/);

        // get class-string from article-element
        const classString = articleElement[0].match(/class="[^"]*?"/);

        /*  Tests for box_decoration -> */

        // Check if placement of article teaser is to the right on desktop
        expect(classString[0]).to.include(`desktop-floatRight`);

        // Check if placement of article teaser is to the right on mobile
        expect(classString[0]).to.include(`mobile-floatRight`);

        // Check vertical align on desktop.
        expect(classString[0]).to.include(`grid-vas-start`);

        // Check vertical align on mobile.
        expect(classString[0]).to.include(`mobile-grid-vas-start`);

        // Check compact display (contextual menu label 'Compact design')
        expect(classString[0]).to.include('compactDisplay');

        /* <- Tests for box_decoration */

        /* Tests of filtered values -> */
        // Check if paywall is active
        expect(classString[0]).to.include('paywall');


        /* <- Tests for filtered values */

        // CSS GRID and ABSOLUTE GRID
        // Hvis width ikke er lagt inn, så defaultes det til 12.
        // Lyktes ikke med å sette data med 'grid'
        expect(classString[0]).to.include('small-12');
        expect(classString[0]).to.include('large-6');
        expect(classString[0]).to.include('small-abs-12');
        expect(classString[0]).to.include('large-abs-6');

        // Check if data-image-float is set from child image element floating right.
        assert.match(result[0], /data-image-float="floatRight"/, 'Check that article element has data-image-float');


    });

});
