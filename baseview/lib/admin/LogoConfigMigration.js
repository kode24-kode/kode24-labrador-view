export default class LogoConfigMigration {

    constructor(tool) {
        this.tool = tool;
        this.migrated = false;
    }

    getListener() {
        return this.dataModified.bind(this);
    }

    dataModified(_data, modifiedPaths) {
        // Only run once, on initial load before any user edits
        if (this.migrated) { return; }
        if (modifiedPaths && modifiedPaths.length > 0) { return; }
        this.migrated = true;
        this.migrate();
    }

    migrate() {
        // Map of [oldFlatPath, newNestedPath] for each logo field
        const migrations = [
        ['logo.uploadedFileUrl',           'logo.mainLogo.uploadedFileUrl'],
        ['logo.logoWidth',                 'logo.mainLogo.logoWidth'],
        ['logo.logoHeight',                'logo.mainLogo.logoHeight'],
        ['logo.uploadedSecondaryFileUrl',  'logo.secondaryLogo.uploadedSecondaryFileUrl'],
        ['logo.secondaryLogoWidth',        'logo.secondaryLogo.secondaryLogoWidth'],
        ['logo.secondaryLogoHeight',       'logo.secondaryLogo.secondaryLogoHeight'],
        ['logo.uploadedMobileFileUrl',     'logo.mobileLogo.uploadedMobileFileUrl'],
        ['logo.mobileLogoWidth',           'logo.mobileLogo.mobileLogoWidth'],
        ['logo.mobileLogoHeight',          'logo.mobileLogo.mobileLogoHeight'],
        ['logo.uploadedMailmojoFileUrl',   'logo.mailmojoLogo.uploadedMailmojoFileUrl'],
        ['logo.mailmojoLogoWidth',         'logo.mailmojoLogo.mailmojoLogoWidth'],
        ['logo.mailmojoLogoHeight',        'logo.mailmojoLogo.mailmojoLogoHeight'],
        ];

        let hasMigration = false;
        for (const [oldPath, newPath] of migrations) {
            const oldValue = this.tool.getPath(oldPath, true);
            const newValue = this.tool.getPath(newPath, true);
            // Only migrate if old value exists and new field is not yet populated
            if (oldValue !== undefined && oldValue !== null && oldValue !== ''
                && (newValue === undefined || newValue === null || newValue === '')) {
                this.tool.setPath(newPath, oldValue, true);
                this.tool.setPath(oldPath, undefined, false); // Remove old path so migration won't re-run on next load
                hasMigration = true;
            }
        }

        // Re-render the form so the migrated values appear in the input fields
        if (hasMigration) {
            this.tool.redraw();
        }
    }

}
