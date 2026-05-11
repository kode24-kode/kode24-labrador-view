import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for Baseview.
 *
 * Each test loads a data set via /test/visual-frontpage, waits for the
 * Labrador Renderer to finish, and takes a full-page screenshot that
 * Playwright compares against committed baseline snapshots.
 *
 * Run:    pnpm run test:visual
 * Update: pnpm run test:visual:update
 */

const DATA_SETS = ["row_01", "row_02"];

/** Wait for the Labrador Renderer to finish rendering all content. */
async function waitForRenderingComplete(page: import("@playwright/test").Page) {
  await page.locator("div.page-content").waitFor({ state: "visible" });

  await page.waitForFunction(
    () => {
      const content = document.querySelector("div.page-content");
      return content && content.children.length > 0;
    },
    { timeout: 30_000 },
  );

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

test.describe("Baseview visual regression tests", () => {
  for (const dataSet of DATA_SETS) {
    test(`Front page - ${dataSet}`, async ({ page }) => {
      await page.goto(`/test/visual-frontpage?data=${dataSet}`);
      await waitForRenderingComplete(page);
      await expect(page).toHaveScreenshot(`front-page-${dataSet}.png`, {
        fullPage: true,
      });
    });
  }
});

test.describe("Baseview visual regression tests - all rows combined", () => {
  test("Front page - all rows combined", async ({ page }) => {
    await page.goto(`/test/visual-frontpage?data=${DATA_SETS.join(",")}`);
    await waitForRenderingComplete(page);
    await expect(page).toHaveScreenshot("front-page-all-rows-combined.png", {
      fullPage: true,
    });
  });
});
