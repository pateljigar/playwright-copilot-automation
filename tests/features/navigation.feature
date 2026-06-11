@smoke @chrome
Feature: Playwright documentation navigation
  As a developer visiting the Playwright documentation site
  I want to navigate key sections of the site
  So that I can verify the navigation structure works correctly

  Background:
    Given I open the Playwright home page

  Scenario: Home page loads successfully
    Then the page title should contain "Playwright"
    And the get started link should be visible

  Scenario: Navigate to docs section
    When I click the "get started" link
    Then the page URL should contain "docs"
    And the page heading should be "Installation"

  Scenario: Search functionality is accessible
    Then the search bar should be visible
