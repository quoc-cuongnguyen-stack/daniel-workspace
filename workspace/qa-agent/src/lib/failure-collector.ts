import { Page, TestInfo } from '@playwright/test';
import { sanitize, sanitizeHeaders } from './sanitizer';
import { sanitizeDomContent } from './dom-sanitizer';
import { applyLimits, TelemetryLimits } from './telemetry-limiter';

export interface ConsoleEntry {
  type: string;
  text: string;
}

export interface FailedHttpResponse {
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}

export interface FailureTelemetry {
  testTitle: string;
  errorMessage: string;
  currentUrl: string;
  timestamp: string;
  screenshotPath?: string;
  tracePath?: string;
  consoleLogs: ConsoleEntry[];
  failedResponses: FailedHttpResponse[];
  sanitizedDomSnippet: string;
  redactionCount: number;
}

/**
 * Setup listeners on a Playwright Page instance to attach telemetry context.
 */
export class TelemetryCollector {
  private consoleLogs: ConsoleEntry[] = [];
  private failedResponses: FailedHttpResponse[] = [];

  constructor(private page: Page) {
    this.attachListeners();
  }

  private attachListeners() {
    // Collect console logs and errors
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      // Sanitize text before storing
      const { sanitized } = sanitize(text);
      this.consoleLogs.push({ type, text: sanitized });
    });

    // Collect HTTP response errors (>= 400 status code)
    this.page.on('response', async (response) => {
      const status = response.status();
      if (status >= 400) {
        const req = response.request();
        let body: string | undefined;
        try {
          const rawText = await response.text();
          body = sanitize(rawText).sanitized;
        } catch {
          body = '[UNABLE TO READ RESPONSE BODY]';
        }

        const { sanitized: sanitizedUrl } = sanitize(response.url());

        this.failedResponses.push({
          url: sanitizedUrl,
          method: req.method(),
          status,
          statusText: response.statusText(),
          requestHeaders: sanitizeHeaders(req.headers()),
          responseHeaders: sanitizeHeaders(response.headers()),
          responseBody: body,
        });
      }
    });
  }

  /**
   * Capture failure context when a test fails.
   */
  public async collectFailureContext(
    testInfo: TestInfo,
    limits?: Partial<TelemetryLimits>
  ): Promise<FailureTelemetry> {
    const currentUrl = sanitize(this.page.url()).sanitized;
    const testTitle = testInfo.title;
    const rawErrorMessage = testInfo.error?.message ?? 'Unknown test failure';
    const { sanitized: errorMessage, redactionCount: errRedactions } = sanitize(rawErrorMessage);

    // Capture DOM snippet if page is still open
    let rawDom = '';
    try {
      rawDom = await this.page.content();
    } catch {
      rawDom = '<!-- [UNABLE TO FETCH DOM CONTENT] -->';
    }

    const sanitizedDom = sanitizeDomContent(rawDom);

    // Locate screenshot and trace artifacts from testInfo
    const screenshotAttachment = testInfo.attachments.find(
      (a) => a.name === 'screenshot' || a.contentType?.startsWith('image/')
    );
    const traceAttachment = testInfo.attachments.find(
      (a) => a.name === 'trace' || a.path?.endsWith('.zip')
    );

    const rawTelemetry = {
      testTitle,
      errorMessage,
      currentUrl,
      timestamp: new Date().toISOString(),
      screenshotPath: screenshotAttachment?.path,
      tracePath: traceAttachment?.path,
      consoleLogs: this.consoleLogs,
      failedResponses: this.failedResponses,
      sanitizedDomSnippet: sanitizedDom,
      redactionCount: errRedactions,
    };

    // Format console output as string for limiter
    const consoleText = this.consoleLogs
      .map((l) => `[${l.type.toUpperCase()}] ${l.text}`)
      .join('\n');

    // Apply telemetry size limits
    const { limited } = applyLimits(
      {
        domContext: rawTelemetry.sanitizedDomSnippet,
        consoleErrors: consoleText,
        failedResponses: this.failedResponses.map((r) => ({
          url: r.url,
          status: r.status,
          body: r.responseBody,
        })),
      },
      limits
    );

    return {
      ...rawTelemetry,
      sanitizedDomSnippet: (limited.domContext as string) ?? '',
    };
  }
}
