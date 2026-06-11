import { Page } from "@playwright/test";
import { test as base, createBdd } from "playwright-bdd";
import { HomePage } from "../../src/pages/HomePage";
import logger from "../../utils/logger";

export type TestFixtures = {
  homePage: HomePage;
};

export const test = base.extend<TestFixtures>({
  homePage: async ({ page }: { page: Page }, use: (fixture: HomePage) => Promise<void>) => {
    logger.info("Initialising HomePage fixture");
    const homePage = new HomePage(page);
    await use(homePage);
    logger.info("Tearing down HomePage fixture");
  },
});

export const { Given, When, Then } = createBdd(test);
