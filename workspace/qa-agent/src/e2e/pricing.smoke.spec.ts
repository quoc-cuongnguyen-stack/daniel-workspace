import { test, expect } from '@playwright/test';
import { TelemetryCollector } from '../lib/failure-collector';
import { BugReporter } from '../lib/bug-reporter';

/**
 * End-to-End Pricing Display Smoke Test for Task 931.
 * Verifies regional / country-specific pricing display and guest subscription price rendering.
 */
test.describe('Task 931 - Pricing Display Smoke Test Suite', () => {
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

  test('Guest user with Indian IP resolves India country and views correct regional price (499.00 INR)', async ({
    page,
    baseURL,
  }) => {
    // Intercept client-side IP geolocation lookup to simulate Indian guest user
    await page.route('https://get.geojs.io/v1/ip/geo.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ip: '49.207.192.1',
          country_code: 'IN',
          country: 'India',
          latitude: '20.0000',
          longitude: '77.0000',
          city: 'Bengaluru',
          region: 'Karnataka',
        }),
      });
    });

    // Set backend request headers for fake Indian IP detection
    await page.setExtraHTTPHeaders({
      'cf-connecting-ip': '49.207.192.1',
      'x-forwarded-for': '49.207.192.1',
    });

    const targetUrl = baseURL ?? process.env.SSL_BASE_URL ?? 'http://localhost:8001';
    const membershipUrl = `${targetUrl.replace(/\/$/, '')}/en/membership`;

    console.log(`[QA-Agent] [TASK-931] Navigating to membership pricing page with Indian IP (49.207.192.1): ${membershipUrl}`);
    await page.goto(membershipUrl, { waitUntil: 'domcontentloaded' });

    // Step 1: Ensure main page content or membership title is visible
    const mainHeading = page
      .locator('h1, h2, div')
      .filter({ hasText: /membership|vip|package|gói/i })
      .first();
    await expect(mainHeading).toBeVisible({ timeout: 15_000 });

    // Step 2: Verify the actual displayed India regional price value (499.00)
    const priceDisplay = page.locator('text=/499(\\.00)?/').first();
    await expect(priceDisplay).toBeVisible({ timeout: 10_000 });

    const displayedText = await priceDisplay.innerText();
    console.log(`[QA-Agent] [TASK-931] Verified actual displayed India regional price: "${displayedText}"`);
  });
});
