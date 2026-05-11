import dotenv from 'dotenv';
import { defineConfig, devices } from "@playwright/test";

dotenv.config();

const isCI = Boolean(process.env.CI);

const STORAGE_STATE_PATH = "test/playwright/.auth/user.json";

export default defineConfig({
  testDir: "./test/playwright",
  testIgnore: ["**/visual.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(isCI),
  timeout: 60_000,
  retries: 4,
  workers: 2,
  reporter: [["html", { open: isCI ? "never" : "on-failure" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL
      ? `https://${process.env.BASE_URL}`
      : "https://labrador-e2e-test.labdevs.com",
    httpCredentials: {
      username: process.env.AUTH_USERNAME,
      password: process.env.AUTH_PASSWORD,
    },
    viewport: { width: 1728, height: 1117 },
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      retries: 2,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE_PATH,
      },
      testIgnore: [/.*logout.*/, /.*visual.*/],
      dependencies: ["setup"],
    },
    {
      name: "chromium-logout",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE_PATH,
      },
      testMatch: /.*logout.*/,
      dependencies: ["chromium"],
    },
  ],
});
