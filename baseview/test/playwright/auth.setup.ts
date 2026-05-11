/**
 * Playwright authentication setup — runs once before all test projects that
 * depend on it.  It primes the CMS session, logs in, and persists the
 * resulting browser storage state so every subsequent test starts already
 * authenticated.
 *
 * See: https://playwright.dev/docs/auth
 */

import dotenv from 'dotenv';
import { test as setup, expect } from '@playwright/test';

dotenv.config({
  quiet: true
});

// ---------------------------------------------------------------------------
// Configuration (same env-var defaults used by the spec file)
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL || 'labrador-e2e-test.labdevs.com';
const AUTH_USERNAME = process.env.AUTH_USERNAME;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
const LAB_SESSION = process.env.LAB_SESSION;

if (!AUTH_USERNAME || !AUTH_PASSWORD || !LAB_SESSION) {
    throw new Error(
        'Missing required env vars. Ensure AUTH_USERNAME, AUTH_PASSWORD, and LAB_SESSION are set in your .env file.',
    );
}

const base64Auth = Buffer.from(`${AUTH_USERNAME}:${AUTH_PASSWORD}`).toString('base64');

/** Path where the authenticated storage state is written. */
export const STORAGE_STATE_PATH = 'test/playwright/.auth/user.json';

setup('authenticate', async ({ page, context }) => {
    // Seed the browser context with the session cookies so that both
    // page navigations and context.request calls carry them automatically.
    await context.addCookies([
        {
            name: 'LABACTIVE',
            value: '1',
            domain: BASE_URL,
            path: '/',
        },
        {
            name: 'LABSESSID',
            value: LAB_SESSION,
            domain: BASE_URL,
            path: '/',
        },
    ]);

    // Prime the server-side session (mirrors the original primeSession helper).
    // The explicit Cookie header is kept for the API request to guarantee the
    // session id reaches the server even if cookie-jar behaviour differs.
    const primeResponse = await context.request.post(`https://${BASE_URL}`, {
        headers: {
            Authorization: `Basic ${base64Auth}`,
            Cookie: `LABACTIVE=1; LABSESSID=${LAB_SESSION};`,
        },
        timeout: 15_000,
    });

    expect(primeResponse.ok(), `Session priming failed: ${primeResponse.status()} ${primeResponse.statusText()}`).toBeTruthy();

    // Navigate to the login page and complete the sign-in flow.
    await page.goto(`https://${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('#loginForm > li:nth-child(1) > a').click();

    // Wait for the login page to finish loading. The verification GET below
    // confirms the session is actually authenticated, so we don't need to
    // wait for 'networkidle' (which stalls on long-lived connections/polling).
    await page.waitForLoadState('domcontentloaded');

    // Verify the session is actually authenticated before persisting state.
    // A quick GET to the root should return 200 if we're logged in.
    const verifyResponse = await context.request.get(`https://${BASE_URL}/`, {
        timeout: 8_000,
    });
    expect(
        verifyResponse.ok(),
        `Auth verification failed: ${verifyResponse.status()} ${verifyResponse.statusText()} — login flow may not have completed`,
    ).toBeTruthy();

    // Persist the authenticated state for all dependent test projects.
    await context.storageState({ path: STORAGE_STATE_PATH });
});
