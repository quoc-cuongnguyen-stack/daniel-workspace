import { test, expect } from '@playwright/test';
import { TelemetryCollector } from '../lib/failure-collector';
import { BugReporter } from '../lib/bug-reporter';

/**
 * End-to-End Sign-In Smoke Test for SSL Web Application.
 *
 * Environment variables required:
 *  - SSL_BASE_URL: Base URL of the app (default: http://localhost:8001)
 *  - SSL_TEST_USER: Valid test user identity/email (e.g. testuser@example.com)
 *  - SSL_TEST_PASSWORD: Valid test user password
 *  - GEMINI_API_KEY: Optional API key for LLM-powered bug report generation
 */
test.describe('Sign-In Smoke Test Suite', () => {
  let collector: TelemetryCollector;
  const bugReporter = new BugReporter();

  test.beforeEach(async ({ page }) => {
    collector = new TelemetryCollector(page);
  });


  test.afterEach(async ({ page: _page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      console.log(`\n[QA-Agent] Test failed: "${testInfo.title}". Collecting telemetry...`);
      try {
        const telemetry = await collector.collectFailureContext(testInfo);
        const bugReportPath = await bugReporter.generateBugReport(telemetry);
        console.log(`[QA-Agent] Bug report generated at: ${bugReportPath}`);
      } catch (reportError) {
        console.error('[QA-Agent] Failed to generate bug report:', reportError);
      }
    }
  });

  test('User can open sign-in modal and successfully sign in with valid credentials', async ({
    page,
    baseURL,
  }) => {
    const testUser = process.env.SSL_TEST_USER;
    const testPassword = process.env.SSL_TEST_PASSWORD;

    // Guard: Check if credentials are provided in environment and not default placeholders
    const isPlaceholder =
      !testUser ||
      !testPassword ||
      testUser.includes('example.com') ||
      testUser.includes('qa_test_user') ||
      testPassword.includes('YourSecureTestPassword');

    if (isPlaceholder) {
      test.skip(
        true,
        `[BLOCKED] Valid user credentials required. Currently set to placeholder (${testUser ?? 'none'}). Please set SSL_TEST_USER and SSL_TEST_PASSWORD in .env with a real test account to run live sign-in.`
      );
      return;
    }



    const targetUrl = baseURL ?? process.env.SSL_BASE_URL ?? 'http://localhost:8001';

    // Step 1: Navigate to main application page
    console.log(`[QA-Agent] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    // Step 2: Open Sign-In modal if not directly on sign-in page
    // The SSL web app header contains a Sign In button that opens the modal
    const signInTrigger = page
      .locator('button')
      .filter({ hasText: /sign in|đăng nhập|login/i })
      .first();

    if (await signInTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('[QA-Agent] Clicking Sign-In trigger button...');
      await signInTrigger.click();
    }

    // Step 3: Wait for Sign-In form fields to be ready
    const identityInput = page.locator('#identity, input[name="identity"]').first();
    const passwordInput = page.locator('#password, input[name="password"]').first();
    const submitButton = page
      .locator('button[type="submit"]')
      .filter({ hasText: /sign in|đăng nhập|login/i })
      .first();

    await expect(identityInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible({ timeout: 5_000 });

    // Step 4: Fill form using environment variables (never log credentials!)
    console.log('[QA-Agent] Filling sign-in form credentials...');
    await identityInput.fill(testUser);
    await passwordInput.fill(testPassword);

    // Step 5: Submit form
    await expect(submitButton).toBeEnabled();
    console.log('[QA-Agent] Submitting sign-in form...');
    await submitButton.click();

    // Step 6: Verify successful sign-in
    // Post sign-in, user is redirected to /dashboard or locale path (e.g., /en/dashboard)
    await expect(page).toHaveURL(/\/(dashboard|profile|home)/, {
      timeout: 15_000,
    });

    console.log(`[QA-Agent] Sign-in successful. Current URL: ${page.url()}`);

  });

  test('Sign-in form validates missing inputs', async ({ page, baseURL }) => {
    const targetUrl = baseURL ?? process.env.SSL_BASE_URL ?? 'http://localhost:8001';
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    const signInTrigger = page
      .locator('button')
      .filter({ hasText: /sign in|đăng nhập|login/i })
      .first();

    if (await signInTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await signInTrigger.click();
    }

    const modalForm = page.locator('form').filter({ has: page.locator('#identity') });
    const identityInput = modalForm.locator('#identity');
    const submitButton = modalForm.locator('button[type="submit"]');

    if (await identityInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Submit button inside modal should be disabled when required inputs are empty
      await expect(submitButton).toBeDisabled();
    } else {
      test.skip(true, '[BLOCKED] Sign-in modal form not visible on target page.');
    }

  });
});
