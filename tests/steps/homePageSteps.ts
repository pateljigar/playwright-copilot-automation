import { Given, Then, When } from "../fixtures/index";

Given("I open the Playwright home page", async ({ homePage }) => {
  await homePage.navigateToHomePage();
});

Then("the page title should contain {string}", async ({ homePage }, title: string) => {
  await homePage.checkPageTitle(title);
});

Then("the get started link should be visible", async ({ homePage }) => {
  await homePage.checkGetStartedLink();
});

When("I click the {string} link", async ({ homePage }, link: string) => {
  await homePage.clickOnLink(link);
});

Then("the page URL should contain {string}", async ({ homePage }, urlString: string) => {
  await homePage.checkUrl(urlString);
});

Then("the page heading should be {string}", async ({ homePage }, heading: string) => {
  await homePage.checkHeading(heading);
});

Then("the search bar should be visible", async ({ homePage }) => {
  await homePage.checkSearchBar();
});

Then("the GitHub repository link should be visible", async ({ homePage }) => {
  await homePage.checkGitHubLink();
});

Then("the theme toggle button should be visible", async ({ homePage }) => {
  await homePage.checkThemeToggleButton();
});
