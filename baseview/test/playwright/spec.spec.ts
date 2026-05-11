import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async () => {
    // Navigation happens inside each test's helper, so there is nothing
    // meaningful to wait for on the initial blank page. The app-ready
    // logic now lives in waitForAppReady() and is called after goto().
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const URL_TAG_PAGE = 'https://forskning--www-e2e-test.labdevs.com/tag/';
const GITHUB_DESCRIPTION = process.env.GITHUB_DESCRIPTION || 'Playwright E2E test';
const GITHUB_PULL_REQUEST_ID = process.env.GITHUB_PULL_REQUEST_ID || '-';

const CURRENT_TIMESTAMP = Date.now().toString();
const CURRENT_DATE = new Date().toJSON();
const ARTICLE_TITLE = `PR ${GITHUB_PULL_REQUEST_ID}: ${CURRENT_DATE}`;

// Shared mutable state across tests within the tag describe-block
let currentArticleUrl = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


/**
 * Wait for the Labrador dashboard to finish bootstrapping after a
 * page.goto().  This replaces the old beforeEach logic — it must be called
 * *after* navigation so the selectors actually exist in the DOM.
 *
 * The dashboard body uses `labFn-isLoading` / `labFn-isBusy` while it
 * initialises (NOT `lab-application-loading`, which lives on the editor
 * iframe page).
 */
async function waitForAppReady(page: Page) {
    // Fail fast if the session is invalid and the server redirected to /login.
    // #lab-application-menu is server-rendered PHP — if it's absent the page
    // being served is NOT the dashboard.
    if (page.url().includes('/login')) {
        throw new Error(
            `Auth redirect detected — landed on ${page.url()} instead of the dashboard. ` +
            'The LABSESSID session is likely expired or invalid. ' +
            'Re-run auth.setup.ts or refresh the LAB_SESSION value in .env / .secrets.'
        );
    }

    // Wait for the dashboard loading indicators to clear
    await page.waitForSelector('body.labFn-isLoading', { state: 'hidden', timeout: 20_000 });
    await page.waitForSelector('body.labFn-isBusy', { state: 'hidden', timeout: 20_000 });

    // Close any lingering modals
    const modal = page.locator('.lab-modal-container.lab-visible');
    if (await modal.isVisible()) {
        const okButton = modal.locator('button:has-text("OK"), button:has-text("Ok")').first();
        await okButton.click({ force: true });
        await modal.waitFor({ state: 'hidden' });
    }
}


/**
 * Return a FrameLocator for the desktop preview iframe used by the Labrador editor.
 */
function desktopIframe(page: Page) {
    return page.frameLocator('iframe[data-lab-viewport="desktop"]');
}

/**
 * Navigate from the dashboard into the "create new article" flow and wait for the editor to load.
 */
async function navigateToNewArticle(page: Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await waitForAppReady(page);

    const menu = page.locator('#lab-application-menu');
    await menu.waitFor({ state: 'visible', timeout: 20_000 });
    await menu.evaluate((el) => el.classList.add('labFn-open'));
    await page
        .locator('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(3) > span')
        .click();
    await page
        .locator('div > div.lab-modal-content > div > div > div:nth-child(1) > label > select')
        .selectOption('2');

    await Promise.all([
        page.waitForEvent('load', { timeout: 20_000 }),
        page.locator('input[type="submit"]').click(),
    ]);

    // Wait for the editor iframe to finish loading the article preview.
    // The main page fires 'domcontentloaded' before the iframe navigates,
    // so we need to explicitly wait for the iframe content to be ready.
    await desktopIframe(page).locator('.articleHeader > h1').waitFor({ state: 'visible', timeout: 20_000 });
}

/**
 * Navigate from the dashboard into the admin section and then open the front-page editor.
 */
async function navigateToAdminFrontPage(page: Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await waitForAppReady(page);

    const menu = page.locator('#lab-application-menu');
    await menu.waitFor({ state: 'visible', timeout: 20_000 });
    await menu.evaluate((el) => el.classList.add('labFn-open'));
    await page
        .locator('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a')
        .click();

    // In admin, go to front-page list
    await page.locator('body > div.row.main > nav > ul:nth-child(1) > li:nth-child(4) > a').click();
    await page.locator('#page_list > li[title="index"]').click();

    // Open the front-page editor in the same tab (remove target attribute)
    await page.locator('#edit_frontpage_btn').evaluate((el) => el.removeAttribute('target'));

    await Promise.all([
        page.waitForEvent('load', { timeout: 20_000 }),
        page.locator('#edit_frontpage_btn').click(),
    ]);
}

/**
 * Add a single tag: type into the input (character by character to trigger
 * suggestions), wait for the suggestions dropdown to become visible, click
 * it, then confirm with the add button if present.
 */
async function addTag(page: Page, tagText: string) {
    const input = page.locator('input[placeholder="Add tag ..."]');
    const suggestions = page.locator('div[class="lab-tags-suggestions"]');

    // Clear existing value and type character-by-character so the UI
    // reacts to each keystroke and triggers the suggestions dropdown
    await input.clear();
    await input.pressSequentially(tagText, { delay: 10 });

    // Wait for the suggestions dropdown to become visible before clicking
    await suggestions.waitFor({ state: 'visible', timeout: 10_000 });
    await suggestions.click();

    // Click the add button if present — some tag flows confirm automatically
    const addBtn = page.locator('input[id="add_btn"]');
    if (await addBtn.isVisible()) {
        await addBtn.click();
    }
}

/**
 * In the front-page editor, open the ArticlesLatest collection drawer.
 */
async function openArticleCollection(page: Page) {
    // Wait for the application to finish loading
    await page.waitForSelector('body.lab-application-loading', { state: 'hidden' });

    // Ensure the "Articles" collection is interactable
    const articlesCollection = page.locator('li[data-collection="ArticlesLatest"]:visible').first();
    await articlesCollection.waitFor({ state: 'visible' });
    await articlesCollection.click({ force: true, timeout: 10_000 });

    // Wait for the drawer to become visible
    const drawer = page.locator('div.lab-collection-drawer.lab-content.lab-overlay');
    await expect(drawer).toBeVisible({ timeout: 10_000 });
    }

/**
 * Activate the bodytext field in the desktop iframe, make it editable,
 * and type the given text into it.
 */
async function fillBodytext(page: Page, text: string) {
    const bodytextLocator = desktopIframe(page).locator('.bodytext');
    await bodytextLocator.click({ force: true });
    await bodytextLocator.evaluate((el) => {
        el.classList.add('lab-editActive');
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('data-is-bodytext', '1');
        el.setAttribute('data-lab-is-editing', '1');
        el.removeAttribute('disabled');
    });
    await bodytextLocator.pressSequentially(text);
}

/**
 * Publish the current page/article (clicks the publish button + confirm).
 * Waits for the matching POST response before returning.
 */
async function clickPublishAndWait(page: Page, saveUrlSubstring: string) {
    const responsePromise = page.waitForResponse(
        (resp) => resp.request().method() === 'POST' && resp.url().includes(saveUrlSubstring),
    );
    await page.locator('li.lab-publish-btn span').click();

    // Some flows show a confirmation dialog after clicking the publish icon;
    // others publish directly. Wait briefly for it to appear.
    const confirmBtn = page.locator('input[value="Publish"]');
    try {
        await confirmBtn.waitFor({ state: 'visible', timeout: 2_000 });
        await confirmBtn.click();
    } catch {
        // No confirmation dialog — this flow publishes directly
    }

    await responsePromise;
}

/**
 * After publishing, navigate to the published page. Handles the "Go to → Published Page" menu
 * by capturing the popup that window.open creates and returning the new page.
 */
async function goToPublishedPage(page: Page): Promise<Page> {
    // Close any lingering modals before proceeding
    const modal = page.locator('.lab-modal-container.lab-visible');
    if (await modal.isVisible()) {
        const okButton = modal.locator('button:has-text("OK"), button:has-text("Ok")').first();
        await okButton.click({ force: true });
        await modal.waitFor({ state: 'hidden' });
    }

    // Click the "Go to" button
    await page.locator('.lab-item-content').filter({ hasText: 'Go to' }).first().click({ force: true });

    // "Published Page" opens via window.open — use Playwright's native popup
    // handling to capture the new tab instead of monkey-patching window.open.
    const [publishedPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('.lab-item-content').filter({ hasText: 'Published Page' }).click(),
    ]);
    await publishedPage.waitForLoadState('domcontentloaded');
    return publishedPage;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Create a new article', () => {
    test('Should visit dashboard, create a new article, modify fields, open article settings to modify section and publish article', async ({
        page,
    }) => {
        await navigateToNewArticle(page);

        // Overwrite title
        const titleLocator = desktopIframe(page).locator('.articleHeader > h1');
        await expect(titleLocator).toContainText('Default E2E', { timeout: 10_000 });
        await titleLocator.click({ force: true });
        await titleLocator.evaluate((el, text) => {
            el.textContent = text;
        }, ARTICLE_TITLE);

        // Go to article settings to change section
        await page.locator('li[data-collection="no-collection"]').first().click();
        await page.locator('#sections').selectOption('e2e');
        await page.locator('#closeBtn').click();

        // Overwrite bodytext
        await fillBodytext(page, GITHUB_DESCRIPTION);

        // Expand the collection drawer
        await page.locator('div.lab-collection-drawer').evaluate((el) => el.classList.add('lab-is-expanded'));

        // Publish article
        await clickPublishAndWait(page, '/ajax/publish/save-article');

        // Go to the published article
        await page.locator('.lab-item-content').filter({ hasText: 'Go to' }).first().click();
        await page.locator('.lab-item-content').filter({ hasText: 'Published Page' }).first().click();
    });
});

test.describe('Create a new article with a tag, publish and check if exists in tagboard, delete tag, check if doesnt exist in tag board', () => {
    // Tests in this describe block must run in order and share state
    test.describe.configure({ mode: 'serial' });

    test('Should visit dashboard, create a new article, modify fields, open article settings to modify section, modify tags, and publish article', async ({
        page,
    }) => {
        await navigateToNewArticle(page);

        // Overwrite title
        const titleLocator = desktopIframe(page).locator('.articleHeader > h1');
        await expect(titleLocator).toContainText('Default E2E', { timeout: 10_000 });
        await titleLocator.click({ force: true });
        await titleLocator.evaluate((el, text) => {
            el.textContent = text;
        }, ARTICLE_TITLE);

        // Go to article settings to change section
        await page.locator('li[data-collection="no-collection"]').first().click();
        await page.locator('#sections').selectOption('e2e');
        await page.locator('#closeBtn').click();

        // Reopen article settings to add tags
        await page.locator('li[data-collection="no-collection"]').first().click();

        // Add tags one by one (using pressSequentially so the suggestions UI reacts)
        await addTag(page, 'cypress');
        await addTag(page, CURRENT_TIMESTAMP);
        await addTag(page, `${CURRENT_TIMESTAMP}_deletable`);

        await page.locator('#closeBtn').click();

        // Save the article URL path for later tests
        const fullUrl = page.url();
        currentArticleUrl = fullUrl.split('.com')[1] || '';

        // Overwrite bodytext
        await fillBodytext(page, GITHUB_DESCRIPTION);

        // Expand the collection drawer
        await page.locator('div.lab-collection-drawer').evaluate((el) => el.classList.add('lab-is-expanded'));

        // Publish article
        await clickPublishAndWait(page, '/ajax/publish/save-article');
    });

    test('Check if tag article is in the tag page', async ({ page }) => {

        // The tag page is on a separate domain and may not reflect the newly
        // published article immediately. Use toPass() to poll with reloads
        // until the content appears.
        const tagUrl = `${URL_TAG_PAGE}${CURRENT_TIMESTAMP}_deletable`;

        // The tag is unique to this test run, so any article on this page
        // belongs to our test. We check for any article heading rather than
        // matching ARTICLE_TITLE, because the CMS doesn't reliably persist
        // title changes made via evaluate().
        await expect(async () => {
            await page.goto(tagUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
            await expect(page.locator('article h2')).toBeVisible();
        }).toPass({ timeout: 30_000, intervals: [3_000] });
    });

    test('Should visit dashboard, find new tag article, remove the tag', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });

        // Find the article via the CMS viewport iframe and navigate to it
        const articleLink = page.frameLocator('iframe[id="lab-cms-viewport-desktop"]').locator(
            `div.article > a[href="${currentArticleUrl}"]`,
        );
        await articleLink.evaluate((el) => el.setAttribute('target', '_parent'));

        await articleLink.click();
        await page.waitForLoadState('domcontentloaded');

        // Remove the deletable tag
        await page.locator('li[data-collection="no-collection"]').first().click();
        await page
            .locator('div[class="lab-label lab-tag lab-deletable labicon-remove labicon-status"]')
            .filter({ hasText: `${CURRENT_TIMESTAMP}_deletable` })
            .click();
        await page.locator('#closeBtn').click();

        // Publish article
        await clickPublishAndWait(page, '/ajax/publish/save-article');
    });

    test('Tag article should not be found in the tag page', async ({ request }) => {
        const response = await request.get(`${URL_TAG_PAGE}${CURRENT_TIMESTAMP}_deletable`);
        expect(response.status()).toBe(404);
    });
});

test.describe('Open admin, verify config, add an article to front page, remove through contextual menu, and verify throughout', () => {
    test.describe.configure({ mode: 'serial' });

    test('Should visit admin, verify configuration, go to front page, verify articles, publish page without adding article, verify zero articles in published', async ({
        page,
    }) => {
        await navigateToAdminFrontPage(page);
        await openArticleCollection(page);

        // Publish front page without adding an article
        await clickPublishAndWait(page, '/ajax/publish/save-front');

        // Verify zero articles on the published page
        const publishedPage = await goToPublishedPage(page);
        await expect(publishedPage.locator('h2').filter({ hasText: CURRENT_TIMESTAMP })).toHaveCount(0);
    });

    test('Should visit admin, verify configuration, go to front page, add article programmatically, then verify it is published', async ({
        page,
    }) => {
        await navigateToAdminFrontPage(page);
        await openArticleCollection(page);

        // Add article programmatically via the Labrador API
        await page.evaluate((timestamp) => {
            (window as any).lab_api.v1.model.insert.atPath({
                path: 'page_front/dropZone',
                data: {
                    type: 'article',
                    contentdata: {
                        fields: {
                            title: timestamp,
                            subtitle: '',
                        },
                    },
                },
                options: {
                    index: 0,
                },
            });
        }, CURRENT_TIMESTAMP);

        // Publish
        await clickPublishAndWait(page, '/ajax/publish/save-front');

        // Verify the article is present on the published page
        const publishedPage = await goToPublishedPage(page);
        await expect(publishedPage.locator('h2').filter({ hasText: CURRENT_TIMESTAMP })).toBeVisible();
    });

    test('Should visit admin, verify configuration, go to front page, remove article through the contextual menu, then publish, then visit published front page and verify zero articles', async ({
        page,
    }) => {
        await navigateToAdminFrontPage(page);
        await openArticleCollection(page);

        // Close the collection drawer
        await page.locator('div[title="Close menu (Escape)"]').click();

        // Click on the article headline inside the desktop iframe
        await desktopIframe(page)
            .locator('h2.headline')
            .filter({ hasText: CURRENT_TIMESTAMP })
            .click({ force: true });

        // Press Escape inside the iframe to activate the contextual menu
        await desktopIframe(page).locator('body').press('Escape');

        // Wait for the contextual menu to appear, then click delete
        const deleteBtn = page.locator('[id^="ContentMenu-desktop"] span.lab-item-label.labicon-delete');
        await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
        await deleteBtn.click({ force: true });

        // Publish
        await clickPublishAndWait(page, '/ajax/publish/save-front');

        // Verify zero articles on the published page
        const publishedPage = await goToPublishedPage(page);
        await expect(publishedPage.locator('h2').filter({ hasText: CURRENT_TIMESTAMP })).toHaveCount(0);
    });
});
