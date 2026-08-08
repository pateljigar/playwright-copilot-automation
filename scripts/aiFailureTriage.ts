/**
 * Standalone AI failure triage script.
 *
 * Reads the Playwright JSON reporter output (test-results.json), bundles every
 * failed test into a single prompt, and asks Claude for a root-cause analysis
 * per failed test. Writes the result to triage-result.json on disk so a
 * separate CI step (actions/github-script) can post/update a PR comment
 * without going through a GitHub Actions environment variable.
 *
 * This script must never fail the build. Every stage is wrapped in try/catch
 * and every exit path is a graceful `return` — there is no `process.exit(1)`
 * anywhere in this file.
 *
 * Runs both locally (.env + ANTHROPIC_API_KEY) and in CI (ANTHROPIC_API_KEY
 * GitHub secret passed in as an env var to the step).
 *
 * Plain console logging is used here rather than the Winston logger in
 * utils/logger.ts, since Winston in this repo is only wired up for the
 * Playwright test/page-object layer, not for standalone scripts.
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const TEST_RESULTS_PATH = path.resolve(process.cwd(), "test-results.json");
const TRIAGE_OUTPUT_PATH = path.resolve(process.cwd(), "triage-result.json");
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4096;
const MAX_ERROR_TEXT_LENGTH = 2000;

const ANSI_REGEX = /\x1B\[[0-9;]*m/g;
const LOG_PREFIX = "[ai-failure-triage]";

interface PlaywrightError {
  message?: string;
  stack?: string;
}

interface PlaywrightResult {
  status: string;
  retry: number;
  error?: PlaywrightError;
  errors?: PlaywrightError[];
}

interface PlaywrightTest {
  status: string; // 'expected' | 'unexpected' | 'flaky' | 'skipped'
  results: PlaywrightResult[];
}

interface PlaywrightSpec {
  title: string;
  tests: PlaywrightTest[];
}

interface PlaywrightSuite {
  title: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightJsonReport {
  suites: PlaywrightSuite[];
}

interface FailedTestInfo {
  testTitle: string;
  errorMessage: string;
  stackTrace: string;
  retryCount: number;
}

interface TestResultAnalysisItem {
  testTitle: string;
  category: string;
  rootCause: string;
  fix: string;
}

type TriageOutput =
  | { status: "success"; testResultAnalysis: TestResultAnalysisItem[] }
  | { status: "fallback"; message: string };

function log(message: string): void {
  console.log(`${LOG_PREFIX} ${message}`);
}

function logError(message: string): void {
  console.error(`${LOG_PREFIX} ${message}`);
}

function truncate(text: string): string {
  if (text.length <= MAX_ERROR_TEXT_LENGTH) return text;
  return `${text.slice(0, MAX_ERROR_TEXT_LENGTH)}\n... (truncated)`;
}

function cleanText(text: string): string {
  return truncate(text.replace(ANSI_REGEX, "").trim());
}

/**
 * Walks the Playwright JSON report's suite tree and collects every test whose
 * final status is 'unexpected' (i.e. still failing after all retries).
 * File-level suites (whose title is the spec file path, e.g.
 * "tests/features/navigation.feature.spec.js") are skipped when building the
 * human-readable test title — only nested describe/feature-level titles are
 * kept, since playwright-bdd nests each feature in its own test.describe().
 */
function extractFailedTests(report: PlaywrightJsonReport): FailedTestInfo[] {
  const failed: FailedTestInfo[] = [];

  const walkSuite = (suite: PlaywrightSuite, ancestorTitles: string[]): void => {
    const looksLikeFilePath = suite.title.includes("/") || suite.title.includes("\\");
    const titles = looksLikeFilePath ? ancestorTitles : [...ancestorTitles, suite.title];

    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== "unexpected") continue;

        const results = test.results ?? [];
        const lastResult = results[results.length - 1];
        const errorInfo = lastResult?.error ?? lastResult?.errors?.[0];

        failed.push({
          testTitle: [...titles, spec.title].filter(Boolean).join(" > "),
          errorMessage: errorInfo?.message
            ? cleanText(errorInfo.message)
            : "No error message captured",
          stackTrace: errorInfo?.stack ? cleanText(errorInfo.stack) : "No stack trace captured",
          retryCount: lastResult?.retry ?? 0,
        });
      }
    }

    for (const child of suite.suites ?? []) {
      walkSuite(child, titles);
    }
  };

  for (const suite of report.suites ?? []) {
    walkSuite(suite, []);
  }

  return failed;
}

function buildPrompt(failedTests: FailedTestInfo[]): string {
  const testsBlock = failedTests
    .map(
      (t, i) =>
        `Test ${i + 1}:\nTitle: ${t.testTitle}\nRetry count: ${t.retryCount}\nError message: ${t.errorMessage}\nStack trace: ${t.stackTrace}`,
    )
    .join("\n\n");

  return `You are triaging failed Playwright end-to-end test results for a BDD test automation framework.

Below are ${failedTests.length} failed test(s) from a single CI run. For EACH test, determine the most likely root cause and category, and suggest a concrete fix.

Use this category taxonomy (pick the single best fit for each test):
- "Locator issue" - the element locator is wrong, stale, or no longer matches the DOM
- "Timing/flaky" - race condition, timeout, or non-deterministic timing issue
- "Assertion mismatch" - the assertion logic or expected value is wrong given actual app behavior
- "Environment issue" - network, infrastructure, environment configuration, or external dependency problem
- "Genuine bug" - the application under test has an actual defect

If none of these fit well, use a short, similarly specific category label instead.

Failed tests:

${testsBlock}

Respond with ONLY the following JSON structure and nothing else - no prose, no explanation, no markdown code fences:

{
  "testResultAnalysis": [
    {
      "testTitle": "string",
      "category": "string",
      "rootCause": "string",
      "fix": "string"
    }
  ]
}

Include exactly one entry in "testResultAnalysis" per failed test listed above, in the same order.`;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function isTestResultAnalysisItem(value: unknown): value is TestResultAnalysisItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.testTitle === "string" &&
    typeof item.category === "string" &&
    typeof item.rootCause === "string" &&
    typeof item.fix === "string"
  );
}

function validateSchema(parsed: unknown): TestResultAnalysisItem[] {
  if (typeof parsed !== "object" || parsed === null || !("testResultAnalysis" in parsed)) {
    throw new Error("response JSON is missing the 'testResultAnalysis' key");
  }

  const analysis = (parsed as Record<string, unknown>).testResultAnalysis;
  if (!Array.isArray(analysis)) {
    throw new Error("'testResultAnalysis' is not an array");
  }

  analysis.forEach((item, index) => {
    if (!isTestResultAnalysisItem(item)) {
      throw new Error(
        `testResultAnalysis[${index}] is missing one or more required string fields (testTitle, category, rootCause, fix)`,
      );
    }
  });

  return analysis as TestResultAnalysisItem[];
}

/**
 * Schema validation only confirms each entry has the right shape - it says
 * nothing about whether Claude actually analysed every failed test. This
 * checks the response covers exactly the failed tests we asked about: same
 * count, and every testTitle traceable back to one of the failed tests.
 * Title matching is a Set lookup rather than positional, since the prompt
 * asks for the same order but nothing enforces that on Claude's side.
 */
function validateCoverage(analysis: TestResultAnalysisItem[], failedTests: FailedTestInfo[]): void {
  if (analysis.length !== failedTests.length) {
    throw new Error(
      `testResultAnalysis has ${analysis.length} entr${analysis.length === 1 ? "y" : "ies"}, but ${failedTests.length} test(s) failed - Claude did not return one analysis per failed test`,
    );
  }

  const failedTitles = new Set(failedTests.map(t => t.testTitle));
  const unmatched = analysis.find(item => !failedTitles.has(item.testTitle));
  if (unmatched) {
    throw new Error(
      `testResultAnalysis contains a testTitle that does not match any failed test: "${unmatched.testTitle}"`,
    );
  }
}

function writeOutput(output: TriageOutput): void {
  try {
    fs.writeFileSync(TRIAGE_OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  } catch (err) {
    logError(`Failed to write ${TRIAGE_OUTPUT_PATH}: ${(err as Error).message}`);
  }
}

function writeFallback(reason: string): void {
  writeOutput({ status: "fallback", message: `AI triage unavailable this run: ${reason}` });
}

async function main(): Promise<void> {
  // Stage 1: read + parse test-results.json.
  let report: PlaywrightJsonReport;
  try {
    if (!fs.existsSync(TEST_RESULTS_PATH)) {
      log(`No test-results.json found at ${TEST_RESULTS_PATH} - skipping AI triage.`);
      return;
    }
    const raw = fs.readFileSync(TEST_RESULTS_PATH, "utf-8");
    report = JSON.parse(raw) as PlaywrightJsonReport;
  } catch (err) {
    logError(
      `test-results.json exists but could not be parsed as valid JSON - skipping AI triage. Reason: ${(err as Error).message}`,
    );
    return;
  }

  // Stage 2: extract failed tests from the report.
  let failedTests: FailedTestInfo[];
  try {
    failedTests = extractFailedTests(report);
  } catch (err) {
    logError(
      `Failed to extract failed tests from test-results.json - skipping AI triage. Reason: ${(err as Error).message}`,
    );
    return;
  }

  if (failedTests.length === 0) {
    // Zero failed tests: skip entirely, no API call, no comment, no log noise.
    return;
  }

  log(`Found ${failedTests.length} failed test(s). Requesting AI triage from Claude...`);

  // Stage 3: confirm the API key is present. This is a config issue, distinct
  // from a runtime API failure, so it gets its own message and no fallback
  // comment is posted (nothing was attempted).
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logError(
      "CONFIG ISSUE: ANTHROPIC_API_KEY is not set - skipping AI triage. No API call was made and no comment will be posted.",
    );
    return;
  }

  // Stage 4: call the Claude API.
  let responseText: string;
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: buildPrompt(failedTests) }],
    });

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );
    if (!textBlock) {
      throw new Error("Claude response contained no text content");
    }
    responseText = textBlock.text;
  } catch (err) {
    const reason = (err as Error).message || "unknown error";
    logError(`Claude API call failed - posting fallback comment. Reason: ${reason}`);
    writeFallback(reason);
    return;
  }

  // Stage 5: parse and validate the response against the expected schema.
  let analysis: TestResultAnalysisItem[];
  try {
    const parsed: unknown = JSON.parse(stripCodeFences(responseText));
    analysis = validateSchema(parsed);
    validateCoverage(analysis, failedTests);
  } catch (err) {
    const reason = (err as Error).message || "response did not match the expected schema";
    logError(
      `Claude response did not match the expected schema - posting fallback comment. Reason: ${reason}`,
    );
    writeFallback(reason);
    return;
  }

  // Stage 6: write the successful result to disk for the comment-posting step.
  writeOutput({ status: "success", testResultAnalysis: analysis });
  log(`Triage complete. Wrote ${analysis.length} result(s) to ${TRIAGE_OUTPUT_PATH}.`);
}

main().catch((err: unknown) => {
  // Final safety net: this script must never fail the build.
  logError(
    `Unexpected error in AI triage script (build is not affected): ${(err as Error).message}`,
  );
});
