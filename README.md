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

| Category     | Tools                               |
| ------------ | ----------------------------------- |
| Test runner  | Playwright + playwright-bdd         |
| Language     | TypeScript (strict mode)            |
| Pattern      | BDD (Gherkin) + Page Object Model   |
| Code quality | ESLint v9 (flat config), Prettier   |
| Git hooks    | Husky + lint-staged                 |
| Logging      | Winston (console + file transports) |
| Config       | dotenv                              |
| CI/CD        | GitHub Actions                      |

---

## Project Structure

```
.
├── .github/
│   ├── workflows/playwright.yml    # CI pipeline
│   └── copilot-instructions.md     # GitHub Copilot inline guidance
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

## Roadmap

**Phase 2 — Playwright CLI self-healing (in progress)**

Extending the AI workflow with [`@playwright/cli`](https://github.com/microsoft/playwright-cli) to give Claude Code the ability to inspect a live browser session directly:

- Verify generated locators against the real DOM before writing test code
- Self-heal failing tests by snapshotting the live page, identifying the correct selector, and updating the Page Object — closing the loop between test failure and fix without manual intervention

---

## License

MIT
