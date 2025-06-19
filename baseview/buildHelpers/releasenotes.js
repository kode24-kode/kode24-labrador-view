/**
 * Get last releasenotes-file and count items in it.
 * Store string in version-file:
 * "userReleasenotes": "145:12"
 * This can be used by the editor to address the most resent release-note.
 * This again can be used to hint to user if new releasenote(s) exist.
 */

import fs from 'fs';
import { versionFileHelper as fileHelper } from './versionFileHelper.js';

const versionFile = 'config/version.json';
const bumpBuildVersion = (path, versionObj, viewName = 'baseview', buildname = 'releasenotes') => {
    const obj = Object.assign(fileHelper.getDefaultVersionObject(), versionObj);
    fs.readdir(path, (err, files) => {
        console.log(`Updating notes from path: ${ path }, view: ${ viewName }, build name: ${ buildname }  ...`);
        if (err) {
            console.log(`Unable to scan directory: ${ err }`);
            return;
        }
        const notes = files.filter((pth) => {
            const parts = pth.split('.');
            const ext = parts.pop();
            if (ext !== 'json') {
                return false;
            }
            return parseInt(parts[0], 10) !== 'NaN';
        });
        const numbers = notes.map((pth) => parseInt(pth.split('.').shift(), 10)).sort();
        const lastEntry = numbers.pop();
        if (lastEntry) {
            fileHelper.readJsonFile(`${ path }/${ lastEntry }.json`).then((releasenote) => {
                const result = `${ lastEntry }:${ releasenote.releasenotes.items.length }`;
                if (obj.view_build[viewName][buildname] === result) {
                    console.log(`'${ buildname }' version-string "${ result }" already exist.`);
                    return;
                }
                obj.view_build[viewName][buildname] = result;
                fileHelper.saveJsonFile(versionFile, obj);
                console.info(`'${ buildname }' version-string "${ result }" saved to "${ versionFile }"`);
            });
        } else {
            console.log('Could not find last release-note ...');
        }
    });
};

console.log(`Updating numbers for last release-notes in file ${ versionFile } ...`);

fileHelper.readJsonFile(versionFile).then((versionObj) => {
    bumpBuildVersion('./releasenotes/developer', versionObj, 'baseview', 'releasenotes');
    bumpBuildVersion('./releasenotes/user', versionObj, 'baseview', 'userReleasenotes');
}).catch((err) => {
    console.log('Error fetching version file: ', err);
});
