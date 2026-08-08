import { expect, Locator, Page } from "@playwright/test";
import logger from "../../utils/logger";

export class HomePage {
  private readonly page: Page;
  private readonly searchBar: Locator;
  private readonly githubLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBar = this.page.getByRole("button", { name: /Search/ });
    this.githubLink = this.page.getByRole("link", { name: "GitHub repository" });
  }

  async navigateToHomePage(): Promise<void> {
    await this.page.goto("/");
  }

  async checkPageTitle(title: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(title));
  }

  async checkGetStartedLink(): Promise<void> {
    await expect(this.link("Get started")).toBeVisible();
  }

  async clickOnLink(link: string): Promise<void> {
    const linkLocator = this.link(link);
    await linkLocator.click();
  }

  async checkUrl(urlString: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(urlString));
  }

  async checkHeading(heading: string): Promise<void> {
    await expect(this.heading(heading)).toBeVisible();
  }

  async checkSearchBar(): Promise<void> {
    await expect(this.searchBar).toBeVisible();
    await expect(this.searchBar).toBeEnabled();
  }

  async checkGitHubLink(): Promise<void> {
    logger.info("Checking GitHub repository link visibility");
    await expect(this.githubLink).toBeVisible();
  }

  async checkThemeToggleButton(): Promise<void> {
    const themeToggleButton = this.page.getByRole("button", {
      name: /Switch between dark and light mode/i,
    });
    await expect(themeToggleButton).toBeVisible();
  }

  private link(link: string): Locator {
    return this.page.getByRole("link", { name: link });
  }

  private heading(heading: string): Locator {
    return this.page.getByRole("heading", { name: heading });
  }
}
