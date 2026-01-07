/**
 * Use Labrador renderer to render test data for visual testing.
 * Imported data should reflect most of the features in Baseview.
 * This is used to test visual changes in the Baseview.
 * The data is imported dynamically based on the `data` query parameter in the URL.
 * Example: ?data=row_01,row_02
 */

import { Renderer } from '../public/common/labrador/Renderer.js';

const log = (msg, ...args) => {
    console.log(`[Visual test] ${ msg }`, ...args);
};

const renderer = new Renderer({
    site: {
        alias: 'demo',
        display_name: 'demo_site',
        domain: 'https://example.com',
        id: 1
    },
    app: {
        image_server: 'https://image.labradorcms.com',
        device: 'desktop'
    }
});

const urlParams = new URLSearchParams(window.location.search);
const filenames = (urlParams.get('data') || '').split(',');
const files = new Array(filenames.length).fill(null);
const promises = [];
for (const filename of filenames) {
    const path = `./data/${ filename }.js`;
    log(`Importing ${ filename } ...`);
    const promise = import(path)
        .then((module) => {
            log(`Successfully imported ${ filename } at index ${ filenames.indexOf(filename) }`);
            files[filenames.indexOf(filename)] = module.default;
        })
        .catch((err) => {
            console.error(`Error importing ${ filename }:`, err);
        });
    promises.push(promise);
}
Promise.all(promises).then(() => {
    log('All files imported:', filenames.join(', '));
    renderer.setData(files);
    renderer.render().then((markup) => {
        log(`Rendering completed with ${ markup.length } items.`);
        const container = document.querySelector('div.page-content');
        for (const item of markup) {
            log(`Inserting markup with ${ item.length } characters.`);
            const el = document.createElement('div');
            el.innerHTML = item;
            const domElements = [...el.children];
            while (domElements.length > 0) {
                container.appendChild(domElements.shift());
            }
        }
    }).catch((err) => {
        log('Error: ', err);
    });
}).catch((err) => {
    console.error('Error importing files:', err);
});
