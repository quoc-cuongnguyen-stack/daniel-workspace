---
name: test-workflow
description: >
  Write and run SSL Vitest unit and FE e2e tests with every application code change.
  QA is run-only (Playwright capture + trace + results). Use when changing
  ssl-be, ssl-fe-user, or ssl-fe-admin, or when the user says test, unit test,
  e2e, QA test, run QA, viet test, chay test, sua, them, fix, implement, add.
---

# Test workflow

Trigger: application code is being edited, or the user asks to write or run tests.
Goal: the same turn that changes product code writes Vitest tests and runs unit plus FE e2e. QA only captures traces and returns results. Do not wait for a second "chạy test" message.

## Same-turn loop (mandatory)

After any behavior change in `ssl-be`, `ssl-fe-user`, or `ssl-fe-admin`, finish this list before the reply.

1. Identify the new or changed behavior.
2. Add or update the Vitest unit test next to that code.
3. For a bug: the assertion must fail on the old path and pass after the fix.
4. If the change can affect a user flow, add or update a FE `*.test.e2e.ts` next to the product code. Do not add or edit `qa-agent` spec files.
5. Run tests for the touched module in this turn:
   - `ssl-be`: `pnpm --prefix ssl-be test:unit`
   - `ssl-fe-user`: `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
   - `ssl-fe-admin`: `pnpm --prefix ssl-fe-admin test:unit` then `pnpm --prefix ssl-fe-admin test:e2e`
6. If a command fails, fix code or test and rerun until it exits 0, or report FAILED/BLOCKED.
7. Do not report the change as done until those commands ran in this turn.

Skip only for docs, comments, skills/rules, or formatting with no behavior change. Say so in one sentence.

Never say "tests should be added later" or ask the user to say "test" again.

## QA is capture only

QA is not a place to write product tests. Do not create or update files under `daniel_workspace/qa-agent/src/e2e/`.

When the user says "QA test", "run QA", "test QA flow", or a user-facing flow must be checked in the browser:

1. Run the existing Playwright suite: `pnpm --prefix daniel_workspace/qa-agent test:e2e`
2. Use it only to capture traces and collect results (`test-results/`, `playwright-report/`, Playwright trace).
3. Report PASSED / FAILED / BLOCKED / SKIPPED plus artifact paths. Never print secrets.
4. A passing smoke must not call Gemini.
5. Login is proven by a stable authenticated UI element, not by URL.
6. Jaeger down does not fail the smoke. Playwright traces and Jaeger traces stay separate.

Do not run qa-agent `build`, `lint`, or `test` as part of a product-code change. Do not invent a second QA project.

## Route

| Change lives in | Write + run | Do not write |
| --- | --- | --- |
| `ssl-be` | Vitest `*.test.ts` | qa-agent specs |
| `ssl-fe-user` | Vitest `*.test.unit.ts` and `*.test.e2e.ts` | qa-agent specs |
| `ssl-fe-admin` | Vitest `*.test.unit.ts` and `*.test.e2e.ts` | qa-agent specs |
| QA / browser check | nothing new | only run Playwright for capture + results |

## Commands

Repo has no root `package.json`. Prefix every app command.

```bash
# ssl-be
pnpm --prefix ssl-be test:unit
pnpm --prefix ssl-be exec vitest run src/modules/<area>/<file>.test.ts

# ssl-fe-user
pnpm --prefix ssl-fe-user test:unit
pnpm --prefix ssl-fe-user test:e2e
pnpm --prefix ssl-fe-user exec dotenvx run -- vitest run --config src/shared/vitest/vitest.config.unit.ts src/path/to/file.test.unit.ts

# ssl-fe-admin
pnpm --prefix ssl-fe-admin test:unit
pnpm --prefix ssl-fe-admin test:e2e

# QA capture + trace + results only
pnpm --prefix daniel_workspace/qa-agent test:e2e
```

A single-file Vitest run is a warmup. The module unit suite and (on FE) the module e2e suite still run in the same turn.

`ssl-fe-user` scripts wrap Vitest with `dotenvx`. Keep that wrapper for npm scripts and single-file runs.

Read `SSL_TEST_USER`, `SSL_TEST_PASSWORD`, `GEMINI_API_KEY`, `SSL_BASE_URL` only from `daniel_workspace/qa-agent/.env` or the process environment. Never print or commit them.

## File names

Place the test next to the product code:

- `ssl-be`: `foo.test.ts`
- `ssl-fe-user` / `ssl-fe-admin`: `foo.test.unit.ts` or `foo.test.e2e.ts`

Do not invent a new runner, config, or test folder. Do not add `qa-agent` `*.spec.ts` or `src/e2e/*.spec.ts` for a product change.

## Lint after test edits

| Touched | Lint |
| --- | --- |
| `ssl-be` | `pnpm --prefix ssl-be lint` |
| `ssl-fe-user` | `pnpm --prefix ssl-fe-user lint` |
| both apps | both commands |
| QA capture only | no product lint |

If `cyberskill lint` rewrites `package.json` versions, restore the file and lint touched files with `pnpm exec eslint <files>`. Do not reinstall with the agent sandbox pnpm (often 10.x / Node 22). This repo expects Node 24 and the user's pnpm 11 store.

On a product failure after tests: follow debug-workflow, `debug_log.md`, and `bug_cases`. QA infra or missing traces are not product bugs.

## Report

- Files changed, including the new or updated Vitest file
- Commands actually executed
- Lint, unit, FE e2e, QA capture as separate statuses
- Whether Gemini was called
- Whether Jaeger was available
- QA artifact / trace paths with no secrets
- Remaining blockers

A command counts as passed only when it ran and exited 0.

## Additional resources

- Debug + journaling: [../debug-workflow/SKILL.md](../debug-workflow/SKILL.md)
