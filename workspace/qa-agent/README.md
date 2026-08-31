# Playwright QA Agent 🤖🎭

An automated E2E testing agent built with **Playwright Test**, **TypeScript**, and **Google Gemini** for the SSL Web Application.

## Key Features

- 🔐 **Zero Secret Leakage:** Credentials and API keys read strictly from environment variables. Sanitizer automatically redacts passwords, tokens, cookies, auth headers, JWTs, and PII before telemetry touches any LLM.
- ⚡ **Telemetry Size Limits:** Enforces strict character budgets on DOM snippets, console logs, and network bodies sent to external services.
- 📝 **Local Markdown Bug Drafts:** Generates structured bug report drafts locally on test failure using Google Gemini API (`GEMINI_API_KEY`). Never pushes automatically to GitHub or Jira.
- 🎯 **Deterministic & Stable Selectors:** Built with resilient locator patterns targeting ARIA roles, input IDs, and localized label text.

---

## Setup & Installation

### 1. Install Dependencies & Playwright Browsers

```bash
cd daniel_workspace/qa-agent
pnpm install # or npm install
npx playwright install chromium
```

### 2. Configure Environment Variables

Copy the `.env.example` file and configure your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```ini
# Application URL
SSL_BASE_URL=http://localhost:8001

# Test User Credentials (REQUIRED for E2E)
SSL_TEST_USER=your_test_user@example.com
SSL_TEST_PASSWORD=YourPassword123!

# LLM API (OPTIONAL for bug reports)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
```

---

## Usage Scripts

| Command | Description |
|---|---|
| `pnpm build` | Run TypeScript typecheck (`tsc --noEmit`) |
| `pnpm test` | Run Vitest unit tests (sanitizer, limiter, DOM sanitizer) |
| `pnpm test:e2e` | Run Playwright E2E smoke tests in headless mode |
| `pnpm test:e2e:headed` | Run E2E tests in visible browser window |
| `pnpm test:e2e:ui` | Open Playwright UI mode |
| `pnpm report` | Serve Playwright HTML test report |

---

## Project Architecture

```
qa-agent/
├── src/
│   ├── e2e/
│   │   └── sign-in.smoke.spec.ts   # E2E sign-in smoke test
│   └── lib/
│       ├── sanitizer.ts             # Redacts secrets, tokens, PII
│       ├── sanitizer.spec.ts        # Unit tests for sanitizer
│       ├── dom-sanitizer.ts         # Cleans DOM HTML for LLM context
│       ├── dom-sanitizer.spec.ts    # Unit tests for DOM sanitizer
│       ├── telemetry-limiter.ts    # Enforces size/token limits
│       ├── telemetry-limiter.spec.ts# Unit tests for limiter
│       ├── failure-collector.ts     # Captures page/network telemetry
│       └── bug-reporter.ts          # Generates local Markdown bug reports via Gemini
├── playwright.config.ts             # Playwright configuration
├── vitest.config.ts                 # Vitest unit test configuration
├── tsconfig.json                    # TypeScript configuration
├── eslint.config.mjs                # ESLint 9 configuration
└── .env.example                     # Environment variable template
```

---

## Security & Privacy Guarantee

1. **No External Issue Creation:** This project never creates GitHub Issues, Jira tickets, or external webhooks automatically.
2. **Local Drafts Only:** Generated bug reports are saved locally to `test-results/bug-reports/BUG-REPORT-*.md`.
3. **Data Redaction:** Passwords, authorization headers, JWTs, cookies, emails, and input fields are stripped BEFORE any LLM prompt is sent.
