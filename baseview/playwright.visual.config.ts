import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration for visual regression testing.
 *
 * This is separate from the main playwright.config.ts which targets
 * the remote Labrador CMS for e2e testing. Visual tests run against
 * a local static server that serves the Baseview test pages.
 *
 * Baseline screenshots are committed to the repository. When a test
 * fails due to a visual difference, the diff image is saved to the
 * test-results directory for inspection.
 *
 * To update baselines: pnpm run test:visual:update
 */
export default defineConfig({
  testDir: "./test/playwright",
  testMatch: "visual.spec.ts",
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(process.env.CI),

  retries: 0,
  workers: 2,

  reporter: [["html", { open: process.env.CI ? "never" : "on-failure" }], ["list"]],

  /* Snapshot comparison settings */
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0,
    },
  },

  use: {
    baseURL: "http://localhost:8000",
    trace: "on-first-retry",
  },

  /* Start a local static file server before running visual tests */
  webServer: {
    command: "pnpm run start:server",
    url: "http://localhost:8000",
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ]
});
