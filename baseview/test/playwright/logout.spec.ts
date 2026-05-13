/**
 * Logout test — extracted into its own file so it can run in a dedicated
 * Playwright project *after* all other tests.  Logging out invalidates the
 * server-side session, which would break any test that still needs it.
 */

import { test, expect } from '@playwright/test';

test.describe('Open admin, verify config, then log out', () => {
    test('Should visit admin, verify configuration, then test logging out', async ({
        page,
        context,
    }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        // Navigate to admin
        await page.locator('#lab-application-menu').evaluate((el) => el.classList.add('labFn-open'));
        await page
            .locator('#lab-application-menu > section > div:nth-child(1) > ul:nth-child(2) > li:nth-child(2) > a')
            .click();

        // In admin, verify configuration
        await page.locator('body > div.row.main > nav > ul:nth-child(1) > li:nth-child(4) > a').click();

        // Click on log out button
        await page.locator('a[title="Log out"]').click();

        // Verify that we are redirected to the login page
        await expect(page).toHaveURL(/\/login$/);

        // Verify unauthenticated status on request to base URL (401 or 302 redirect to login)
        const response = await context.request.get('/', {
            maxRedirects: 0,
        });
        expect([401, 302]).toContain(response.status());
    });
});
