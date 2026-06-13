# GitHub Copilot Instructions

## Project Conventions

- Step definitions named `*Steps.ts` in `tests/steps/`, import `Given`/`When`/`Then` from `tests/fixtures/index.ts` only
- Page Object classes named `*Page.ts` in `src/pages/`, one class per page
- One feature file per domain in `tests/features/`

## Coding Rules

- Always use `await` on every Playwright call
- Use Playwright native locator APIs only — never XPaths. Prioritise role-based or test-id selectors
- Use `logger.info()` at the start of each page method; `logger.error()` in catch blocks for non-Playwright operations
- Never hardcode URLs, credentials, or API keys — use `process.env`, loaded via `.env` (see `.env.example`)
- Assertions and business logic belong in Page classes, not step definitions
- Extract shared logic to `utils/` if used across more than one page class
