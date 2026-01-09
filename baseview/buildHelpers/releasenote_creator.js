import fs from 'fs';
import readline from 'readline';
import { exec } from 'node:child_process';

import { versionFileHelper } from './versionFileHelper.js';

const readlineInst = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Path to the version.json file
const versionFilePath = './config/version.json';

const getDefaultReleasenoteFile = (view_version, viewVersionInt) => ({
    releasenotes: {
        version: {
            int: viewVersionInt,
            str: view_version
        },
        items: []
    }
});

const createReleaseNote = (isDeveloper, viewVersion, viewVersionInt) => {
    const newNote = {
        releasenotes: {
            items: []
        }
    };

    // Create a new release note file with the current timestamp
    const filename = `./releasenotes/${ isDeveloper ? 'developer' : 'user' }/${ viewVersionInt }.json`;

    // Ensure the directory exists
    fs.mkdirSync(`./releasenotes/${ isDeveloper ? 'developer' : 'user' }`, { recursive: true });

    // Check if the file already exists, if not create it using content from method getDefaultReleasenoteFile()
    if (!fs.existsSync(filename)) {
        newNote.releasenotes = getDefaultReleasenoteFile(viewVersion, viewVersionInt).releasenotes;
    }

    // If it exist, load it:
    else {
        try {
            const existingNote = JSON.parse(fs.readFileSync(filename, 'utf8'));
            newNote.releasenotes = existingNote.releasenotes;
        } catch (error) {
            console.error('Error reading existing release note:', error);
            readlineInst.close();
            return;
        }
    }

    readlineInst.question('Is this a bug, feature, or improvement? (bug/feat/impr, default: impr): ', (itemType) => {
        const itemTypeLower = itemType.toLowerCase();
        const isBug = itemTypeLower === 'bug';
        const isFeature = itemTypeLower === 'feat';
        const isImprovement = !isBug && !isFeature;  // Default to isImprovement

        const item = {
            date: new Date().toISOString().split('T')[0].replace(/-/g, ''), // Format YYYYMMDD
            title: '',
            description: '',
            links: []
        };
        if (isBug) {
            item.isBug = true;
        } else if (isFeature) {
            item.isFeature = true;
        } else if (isImprovement) {
            item.isImprovement = true;
        }

        readlineInst.question('Title: ', (title) => {
            item.title = title;

            readlineInst.question('Description: ', (description) => {
                item.description = description;

                // Add the item to the releasenotes
                newNote.releasenotes.items.push(item);

                // Write the updated note back to the file
                writeReleaseNoteToFile(filename, newNote);
            });
        });

    });
};

const writeReleaseNoteToFile = (filename, newNote) => {
    // Write the updated release note to the file
    console.log('Writing release note to file:', filename);

    fs.writeFile(filename, JSON.stringify(newNote, null, 4), (err) => {
        if (err) {
            console.error('Error creating release note:', err);
            readlineInst.close();
            return;
        }

        // Run the npm action build:version
        console.log(`Release note created successfully at ${filename}`);
        console.log('Running npm action build:version ...');

        exec('npm run build:releasenotes:version', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing npm run build:version: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);
        });
        // Close the readline interface
        readlineInst.close();
    });
};

// Usage example
versionFileHelper.readJsonFile(versionFilePath)
    .then((versionData) => {

        const viewVersionInt = parseInt(versionData.view_version.split('.').join(''), 10);

        console.log('------------------------------------------------------');
        console.log(`Creating release note for version: ${ versionData.view_version } (int: ${ viewVersionInt })`);
        console.log('------------------------------------------------------');

        readlineInst.question('Is this a developer release note? (yes/no, default: no): ', (answer) => {
            const isDeveloper = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
            createReleaseNote(isDeveloper, versionData.view_version, viewVersionInt);
        });
    })
    .catch((error) => {
        console.error('Error:', error);
    });
