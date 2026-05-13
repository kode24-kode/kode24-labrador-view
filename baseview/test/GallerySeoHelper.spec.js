import { expect } from 'chai';
import { GallerySeoHelper } from '../modules/lib/helpers/GallerySeoHelper.js';

// Minimal locale stub that mimics lab_api.v1.locale.get:
// - returns the literal key when missing (Labrador default behaviour)
// - interpolates mustache-style tokens when key is present
const makeLocale = (dict) => ({
    get(key, opts = {}) {
        if (!(key in dict)) { return key; }
        let out = dict[key];
        if (opts.data) {
            for (const [k, v] of Object.entries(opts.data)) {
                out = out.replaceAll(`{{ ${ k } }}`, String(v));
            }
        }
        return out;
    }
});

const locale = makeLocale({
    'gallery.autoDescription': '{{ n }} bilder fra «{{ title }}»'
});

describe('GallerySeoHelper', () => {

    describe('composeTitle', () => {

        it('joins articleTitle and galleryLabel with an em-dash when both present', () => {
            const result = GallerySeoHelper.composeTitle({
                articleTitle:   'Article',
                slideshowTitle: 'Slideshow',
                galleryLabel:   'Gallery',
                siteName:       'Site'
            });
            expect(result).to.equal('Article — Gallery | Site');
        });

        it('uses articleTitle alone when galleryLabel is missing', () => {
            const result = GallerySeoHelper.composeTitle({
                articleTitle: 'Article',
                galleryLabel: '',
                siteName:     'Site'
            });
            expect(result).to.equal('Article | Site');
        });

        it('falls back to slideshowTitle when no articleTitle', () => {
            const result = GallerySeoHelper.composeTitle({
                slideshowTitle: 'Slideshow only',
                galleryLabel:   'Gallery',
                siteName:       'Site'
            });
            expect(result).to.equal('Slideshow only | Site');
        });

        it('falls back to galleryLabel when nothing else is set', () => {
            const result = GallerySeoHelper.composeTitle({
                galleryLabel: 'Gallery',
                siteName:     'Site'
            });
            expect(result).to.equal('Gallery | Site');
        });

        it('returns siteName alone when everything else is empty', () => {
            const result = GallerySeoHelper.composeTitle({
                siteName: 'Site'
            });
            expect(result).to.equal('Site');
        });

        it('treats whitespace-only articleTitle as empty and falls through the chain', () => {
            const result = GallerySeoHelper.composeTitle({
                articleTitle:   '   ',
                slideshowTitle: 'Real Slideshow',
                galleryLabel:   'Gallery',
                siteName:       'Site'
            });
            expect(result).to.equal('Real Slideshow | Site');
        });

    });

    describe('composeSomeTitle', () => {

        it('prefers slideshowTitle above everything else', () => {
            const result = GallerySeoHelper.composeSomeTitle({
                slideshowTitle:  'Slideshow',
                parentSomeTitle: 'Article SoMe',
                parentTitle:     'Article',
                galleryLabel:    'Gallery',
                siteName:        'Site'
            });
            expect(result).to.equal('Slideshow | Site');
        });

        it('falls back to parentSomeTitle when slideshowTitle is empty', () => {
            const result = GallerySeoHelper.composeSomeTitle({
                parentSomeTitle: 'Article SoMe',
                parentTitle:     'Article',
                galleryLabel:    'Gallery',
                siteName:        'Site'
            });
            expect(result).to.equal('Article SoMe | Site');
        });

        it('falls back to parentTitle when slideshow and parent-some are empty', () => {
            const result = GallerySeoHelper.composeSomeTitle({
                parentTitle:  'Article',
                galleryLabel: 'Gallery',
                siteName:     'Site'
            });
            expect(result).to.equal('Article | Site');
        });

        it('falls back to galleryLabel when nothing else is set', () => {
            const result = GallerySeoHelper.composeSomeTitle({
                galleryLabel: 'Gallery',
                siteName:     'Site'
            });
            expect(result).to.equal('Gallery | Site');
        });

        it('does not compose article + galleryLabel — SoMe titles stay unadorned', () => {
            const result = GallerySeoHelper.composeSomeTitle({
                parentTitle:  'Article',
                galleryLabel: 'Gallery',
                siteName:     'Site'
            });
            // No em-dash join: keep SoMe short and unchanged from the source title.
            expect(result).to.equal('Article | Site');
        });

    });

    describe('withSite', () => {

        it('appends " | siteName"', () => {
            expect(GallerySeoHelper.withSite('Content', 'Site')).to.equal('Content | Site');
        });

        it('does not duplicate site name when content already ends with the full " | site" delimiter (case-insensitive)', () => {
            expect(GallerySeoHelper.withSite('Content | site', 'Site')).to.equal('Content | site');
            expect(GallerySeoHelper.withSite('Content | SITE', 'Site')).to.equal('Content | SITE');
        });

        it('still appends the suffix when content happens to end with siteName but without the delimiter', () => {
            // "MySite" ends with "Site" but isn't actually suffixed; must still get " | Site"
            expect(GallerySeoHelper.withSite('MySite', 'Site')).to.equal('MySite | Site');
            expect(GallerySeoHelper.withSite('Article about the Website', 'Site')).to.equal('Article about the Website | Site');
        });

        it('returns siteName alone when content is empty', () => {
            expect(GallerySeoHelper.withSite('', 'Site')).to.equal('Site');
        });

        it('returns content alone when siteName is empty', () => {
            expect(GallerySeoHelper.withSite('Content', '')).to.equal('Content');
        });

        it('trims whitespace on both sides', () => {
            expect(GallerySeoHelper.withSite('  Content  ', '  Site  ')).to.equal('Content | Site');
        });

    });

    describe('composeDescription', () => {

        it('prefers slideshowDescription above everything else', () => {
            const result = GallerySeoHelper.composeDescription({
                slideshowDescription: 'Slideshow desc',
                parentSeoDescription: 'Article SEO',
                parentSubtitle:       'Subtitle',
                imageCount:           5,
                articleTitle:         'Article',
                locale
            });
            expect(result).to.equal('Slideshow desc');
        });

        it('falls back to parentSeoDescription when slideshow is empty', () => {
            const result = GallerySeoHelper.composeDescription({
                parentSeoDescription: 'Article SEO',
                parentSubtitle:       'Subtitle',
                imageCount:           5,
                articleTitle:         'Article',
                locale
            });
            expect(result).to.equal('Article SEO');
        });

        it('prefers auto-template over parentSubtitle when both are available', () => {
            const result = GallerySeoHelper.composeDescription({
                parentSubtitle: 'Subtitle',
                imageCount:     5,
                articleTitle:   'Article',
                locale
            });
            expect(result).to.equal('5 bilder fra «Article»');
        });

        it('falls back to parentSubtitle when auto-template inputs are missing', () => {
            const result = GallerySeoHelper.composeDescription({
                parentSubtitle: 'Subtitle',
                imageCount:     0,
                articleTitle:   'Article',
                locale
            });
            expect(result).to.equal('Subtitle');
        });

        it('falls back to parentSubtitle when auto-template locale key is missing', () => {
            const emptyLocale = makeLocale({});
            const result = GallerySeoHelper.composeDescription({
                parentSubtitle: 'Subtitle',
                imageCount:     5,
                articleTitle:   'Article',
                locale:         emptyLocale
            });
            expect(result).to.equal('Subtitle');
        });

        it('returns empty string when everything is missing', () => {
            expect(GallerySeoHelper.composeDescription({})).to.equal('');
        });

        it('never returns a literal placeholder', () => {
            const result = GallerySeoHelper.composeDescription({});
            expect(result).to.equal('');
            expect(result).to.not.include('[description]');
        });

        it('rejects a locale template that still contains unresolved mustache tokens', () => {
            const brokenLocale = makeLocale({
                'gallery.autoDescription': '{{ n }} images from {{ title }} and {{ missing }}'
            });
            const result = GallerySeoHelper.composeDescription({
                imageCount:   8,
                articleTitle: 'Title',
                locale:       brokenLocale
            });
            expect(result).to.equal('');
        });

        it('trims whitespace-only candidates and moves to next in chain', () => {
            const result = GallerySeoHelper.composeDescription({
                slideshowDescription: '   ',
                parentSeoDescription: '',
                parentSubtitle:       'Actual content',
                locale
            });
            expect(result).to.equal('Actual content');
        });

        it('truncates descriptions longer than 160 chars', () => {
            const longText = 'a'.repeat(200);
            const result = GallerySeoHelper.composeDescription({
                slideshowDescription: longText,
                locale
            });
            expect(result.length).to.be.at.most(161); // hard-cut 160 + ellipsis
            expect(result.endsWith('…')).to.equal(true);
        });

    });

    describe('composeSomeDescription', () => {

        it('prefers slideshowDescription above everything else', () => {
            const result = GallerySeoHelper.composeSomeDescription({
                slideshowDescription:  'Slideshow desc',
                parentSomeDescription: 'Article SoMe',
                parentSeoDescription:  'Article SEO',
                parentSubtitle:        'Subtitle',
                imageCount:            5,
                articleTitle:          'Article',
                locale
            });
            expect(result).to.equal('Slideshow desc');
        });

        it('prefers parentSomeDescription over parentSeoDescription', () => {
            const result = GallerySeoHelper.composeSomeDescription({
                parentSomeDescription: 'Article SoMe',
                parentSeoDescription:  'Article SEO',
                parentSubtitle:        'Subtitle',
                imageCount:            5,
                articleTitle:          'Article',
                locale
            });
            expect(result).to.equal('Article SoMe');
        });

        it('falls back to parentSeoDescription when SoMe is empty', () => {
            const result = GallerySeoHelper.composeSomeDescription({
                parentSeoDescription: 'Article SEO',
                parentSubtitle:       'Subtitle',
                imageCount:           5,
                articleTitle:         'Article',
                locale
            });
            expect(result).to.equal('Article SEO');
        });

        it('falls back to auto-template over parentSubtitle when inputs permit', () => {
            const result = GallerySeoHelper.composeSomeDescription({
                parentSubtitle: 'Subtitle',
                imageCount:     7,
                articleTitle:   'Article',
                locale
            });
            expect(result).to.equal('7 bilder fra «Article»');
        });

        it('falls back to parentSubtitle when auto-template inputs are missing', () => {
            const result = GallerySeoHelper.composeSomeDescription({
                parentSubtitle: 'Subtitle',
                imageCount:     0,
                articleTitle:   'Article',
                locale
            });
            expect(result).to.equal('Subtitle');
        });

        it('returns empty string when everything is missing', () => {
            expect(GallerySeoHelper.composeSomeDescription({})).to.equal('');
        });

    });

    describe('truncate', () => {

        it('returns input unchanged when under max', () => {
            expect(GallerySeoHelper.truncate('short', 160)).to.equal('short');
        });

        it('returns input unchanged when exactly max', () => {
            const s = 'a'.repeat(160);
            expect(GallerySeoHelper.truncate(s, 160)).to.equal(s);
        });

        it('cuts at word boundary when one lies within the last 25% of max', () => {
            const s = 'word '.repeat(40); // "word word word ..." well past 40 chars
            const result = GallerySeoHelper.truncate(s, 40);
            expect(result.length).to.be.at.most(41);
            expect(result).to.match(/word…$/);
            expect(result).to.not.include('  ');
        });

        it('hard-cuts and appends ellipsis when no acceptable word boundary', () => {
            const s = 'abcdefghij'.repeat(10); // one long word, no spaces
            const result = GallerySeoHelper.truncate(s, 20);
            expect(result.length).to.equal(21); // 20 + ellipsis
            expect(result.endsWith('…')).to.equal(true);
        });

        it('trims trailing whitespace before appending ellipsis', () => {
            const s = 'word    word    word    x';
            const result = GallerySeoHelper.truncate(s, 8);
            expect(result).to.not.include('   …');
        });

    });

});
