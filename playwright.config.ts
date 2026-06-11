import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { defineBddConfig } from "playwright-bdd";

dotenv.config();

const testDir = defineBddConfig({
  features: "tests/features/*.feature",
  steps: "tests/**/*.ts",
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: process.env.CI ? "never" : "on-failure" }],
    process.env.CI ? ["dot"] : ["list"],
  ],

  use: {
    baseURL: process.env.BASE_URL || "https://playwright.dev",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Google Chrome",
      grep: new RegExp("@chrome", "i"),
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "Microsoft Edge",
      grep: new RegExp("@msedge", "i"),
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
  ],
});
