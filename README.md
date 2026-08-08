# Playwright Copilot Automation

AI-augmented Playwright BDD test automation framework — built to demonstrate how AI coding agents (GitHub Copilot, Claude Code) can accelerate test authoring while following enterprise-grade architecture and quality standards.

[![Playwright Tests](https://github.com/pateljigar/playwright-copilot-automation/actions/workflows/playwright.yml/badge.svg)](https://github.com/pateljigar/playwright-copilot-automation/actions/workflows/playwright.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Playwright](https://img.shields.io/badge/Playwright-1.60-2EAD33)

---

## What This Repo Demonstrates

This is an enterprise-grade Playwright BDD framework — TypeScript, Page Object Model, full quality tooling (ESLint, Prettier, Husky, structured logging) — paired with **AI agent instruction files** that let coding agents generate tests, page objects, and step definitions that follow this framework's conventions out of the box.

Two AI tools are configured here, each suited to a different workflow:

- **GitHub Copilot** (`copilot-instructions.md`) — shapes inline code suggestions while developing in VS Code
- **Claude Code** (`CLAUDE.md`) — powers autonomous, multi-file generation and validation tasks via the terminal

Both files encode the same architectural rules — naming conventions, locator strategy, logging, secrets handling — so AI-generated code is indistinguishable from hand-written code that follows the framework's standards.

---

## Tech Stack

| Category          | Tools                                      |
| ----------------- | ------------------------------------------ |
| Test runner       | Playwright + playwright-bdd                |
| Language          | TypeScript (strict mode)                   |
| Pattern           | BDD (Gherkin) + Page Object Model          |
| Code quality      | ESLint v9 (flat config), Prettier          |
| Git hooks         | Husky + lint-staged                        |
| Logging           | Winston (console + file transports)        |
| Config            | dotenv                                     |
| CI/CD             | GitHub Actions                             |
| Report hosting    | AWS S3 static website hosting + CloudFront |
| AI failure triage | Claude API (`@anthropic-ai/sdk`)           |

---

## Project Structure

```
.
├── .github/
│   ├── workflows/playwright.yml    # CI pipeline
│   └── copilot-instructions.md     # GitHub Copilot inline guidance
├── scripts/
│   └── aiFailureTriage.ts          # AI-driven CI failure triage script
├── src/pages/                      # Page Object Model classes (*Page.ts)
├── tests/
│   ├── features/                   # BDD feature files (*.feature)
│   ├── steps/                      # Step definitions (*Steps.ts)
│   └── fixtures/                   # Custom typed fixtures
├── test-data/                      # Path constants, test data
├── utils/                          # Shared utilities (logger, etc.)
├── CLAUDE.md                       # Claude Code agent instructions
├── README.md
├── playwright.config.ts
├── package.json
└── .env.example
```

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/pateljigar/playwright-copilot-automation.git
cd playwright-copilot-automation
npm install

# Set up environment
cp .env.example .env

# Run tests
npm run test
```

Other useful commands:

```bash
npm run test:headed     # Run with visible browser
npm run test:ui         # Playwright UI mode
npm run lint            # Check code quality
npm run format           # Auto-fix formatting
```

---

## Live Test Reports

Every push to `main` runs the full suite and publishes the HTML report to S3 automatically:

**[View Latest Report →](https://d1wu7x6gzdj543.cloudfront.net)**

Reports are overwritten each run, so the link always reflects the most recent CI run on `main`. Publishing is handled via GitHub Actions with a least-privilege IAM user scoped to `PutObject`/`GetObject` on the S3 bucket and `CreateInvalidation` on the CloudFront distribution — nothing else in AWS is reachable with these credentials. The report is served over HTTPS via CloudFront in front of a private S3 origin.

---

## AI Workflow — Claude Code

`CLAUDE.md` gives Claude Code full context on this framework's architecture, naming conventions, and rules — so it can generate new tests that fit seamlessly into the existing codebase.

**Worked example:** Asked Claude Code to scaffold a complete login feature — feature file, page object, step definitions, and fixture registration — based only on the conventions in `CLAUDE.md`:

> _"I need to add a new test for a login page. What files do I need to create and where?"_

Claude correctly identified and generated all required files:

- `tests/features/login.feature` — Gherkin scenarios
- `src/pages/LoginPage.ts` — Page Object with role-based locators
- `tests/steps/loginSteps.ts` — Step definitions importing from `tests/fixtures/index.ts`
- Updated `tests/fixtures/index.ts` to register the new `loginPage` fixture

Claude also proactively flagged a `CLAUDE.md` rule it was following: _"the locators use generic role-based selectors — inspect the actual DOM before running, per the 'never guess locators' rule."_ The generated code passed lint and formatting checks with no manual fixes required.

---

## AI Workflow — GitHub Copilot

`copilot-instructions.md` configures inline suggestions in VS Code, encoding the same naming conventions and coding rules (await usage, locator strategy, logging, secrets handling) so Copilot's suggestions match the framework's standards as you type.

---

## AI Workflow — Self-Healing with Playwright CLI

`@playwright/cli` gives Claude Code the ability to inspect a live browser session directly — closing the loop between a failing test and the fix, without manual diagnosis.

**Worked example:** A locator was written for a new "theme toggle" scenario based on a plausible guess:

```typescript
const themeToggleButton = this.page.getByRole("button", { name: "Theme toggle" });
```

The test failed. Claude Code was given a single instruction:

> _"The test suite is failing. Fix it."_

Claude ran the test, identified the failure, and — rather than guessing again — stated:

> _"The button name 'Theme toggle' doesn't match the actual element on playwright.dev. I need to inspect the live page to find the correct locator."_

It then used `playwright-cli` to open the live site and snapshot the navigation bar, discovering the button's real accessible name: `"Switch between dark and light mode (currently system mode)"`. Rather than hard-coding this longer string, Claude wrote a regex that matches only the stable portion — avoiding the state-dependent suffix that changes based on the user's theme preference:

```typescript
const themeToggleButton = this.page.getByRole("button", {
  name: /Switch between dark and light mode/i,
});
```

All 5 tests passed. The fix was applied directly to the Page Object — the generated test spec was left untouched, per `CLAUDE.md`'s conventions.

This same `playwright-cli` integration is also used during **generation**: when a new scenario describes an element without specifying its exact locator (e.g., _"the link to the GitHub repository in the navigation bar"_), Claude inspects the live DOM to find the correct accessible name before writing the Page Object method — rather than guessing.

---

## AI Workflow — Failure Triage in CI

When tests fail on a pull request, `scripts/aiFailureTriage.ts` reads the Playwright JSON reporter output, bundles every failed test into a single Claude API call, and posts a root-cause analysis directly as a PR comment — before anyone opens the Actions tab.

**Design highlights:**

- **One bundled API call, not one per failure** — all failed tests are sent to Claude in a single request, keeping cost and latency predictable regardless of how many tests fail in a run.
- **Schema and coverage validation on the response** — Claude's output is checked against an exact JSON shape, and cross-checked to confirm it returned exactly one analysis per failed test with matching titles. A response that's valid JSON but incomplete or mismatched is treated as a failure, not silently trusted.
- **Never fails the build** — every stage (missing results file, missing API key, API errors, malformed responses) degrades gracefully with a distinct log message. The AI triage step cannot turn a legitimate pass or fail into a broken CI pipeline.
- **Find-and-update, not always-new** — a hidden marker in the comment body lets subsequent runs update the same comment instead of stacking duplicates on the PR.

**Worked example:** A locator in `HomePage.ts` was deliberately broken to point at the wrong accessible name. CI ran, the test failed, and the triage step posted:

| Test                                 | Category      | Root Cause                                                                                                                                                                  | Suggested Fix                                                                                                                               |
| ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub repository link is accessible | Locator issue | The locator uses an incorrect accessible name for the link role, which does not match the actual link's accessible name on the page, causing the element to never be found. | Update the locator to use the correct accessible name/text matching the actual GitHub link on the page, and verify against the current DOM. |

After the real fix was pushed, the test suite went green and the stale comment was correctly left untouched — no comment is posted when there's nothing to triage.

A second, unrelated failure was then introduced (an outdated assertion on page heading text) to confirm the update logic under different conditions. The same PR comment was found and edited in place — GitHub's UI marked it "edited" rather than creating a second comment — with new content reflecting the new failure, confirming the find-and-update logic holds across multiple distinct runs, not just the first one.

---

## License

MIT
