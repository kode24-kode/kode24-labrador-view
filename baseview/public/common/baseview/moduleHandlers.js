/* eslint-disable no-new */

/**
 * Some element-types store data for use by JS-logic in 'window.dachserData'
 * This module import dependencies, read data, create instances and pass the data to them.
 */

import * as modules from '../build/baseview_dependencie_modules.js?v=13';

const handlers = {
    labradorsearch: (item) => new modules.LabradorSearch(item),
    tagboard: (item) => new modules.Tagboard(item),
    frontcontent: (item) => new modules.FrontContent(item),
    audioInline: (item) => new modules.AudioInline(item)
};

const labradorsearchQueue = window.dachserData.get('labradorsearch') || [];
while (labradorsearchQueue.length) {
    handlers.labradorsearch(labradorsearchQueue.shift());
}

const tagboardQueue = window.dachserData.get('tagboard') || [];
while (tagboardQueue.length) {
    handlers.tagboard(tagboardQueue.shift());
}

const frontcontentQueue = window.dachserData.get('frontcontent') || [];
while (frontcontentQueue.length) {
    handlers.frontcontent(frontcontentQueue.shift());
}

const audioInlineQueue = window.dachserData.get('audioInline') || [];
while (audioInlineQueue.length) {
    handlers.audioInline(audioInlineQueue.shift());
}

// Editor - redraws
window.baseviewModulesReflow = (key, identifierKey, identifierValue) => {
    const keyArray = window.dachserData.get(key);
    if (!Array.isArray(keyArray)) {
        return;
    }
    // Each redraw will add to the key. Use last.
    const last = keyArray.filter((item) => item[identifierKey] === identifierValue).pop();
    if (last && typeof handlers[key] === 'function') {
        handlers[key](last);
    }
};
