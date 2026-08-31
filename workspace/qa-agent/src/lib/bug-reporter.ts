import fs from 'node:fs';
import path from 'node:path';
import { FailureTelemetry } from './failure-collector';
import { sanitize } from './sanitizer';

/**
 * BugReporter module: Takes sanitized failure telemetry and calls the Gemini API
 * to generate a local Markdown bug report draft. Never calls external issue trackers (GitHub/Jira).
 */
export class BugReporter {
  private apiKey: string | undefined;
  private outputDir: string;

  constructor(outputDir: string = path.join(process.cwd(), 'test-results', 'bug-reports')) {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.outputDir = outputDir;
  }

  /**
   * Generates a local Markdown bug report file.
   * Returns path to generated bug report file.
   */
  public async generateBugReport(telemetry: FailureTelemetry): Promise<string> {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `BUG-REPORT-${timestamp}.md`;
    const filepath = path.join(this.outputDir, filename);

    let markdownContent = '';

    if (this.apiKey) {
      try {
        markdownContent = await this.callGeminiApi(telemetry);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn(`[BugReporter] Gemini API call failed: ${errorMessage}. Falling back to template.`);
        markdownContent = this.generateFallbackMarkdown(telemetry, `Gemini API call failed: ${errorMessage}`);
      }
    } else {
      markdownContent = this.generateFallbackMarkdown(
        telemetry,
        'GEMINI_API_KEY environment variable is missing. Set GEMINI_API_KEY to enable LLM-generated bug reports.'
      );
    }

    // Final safety pass: sanitize output before writing to disk
    const { sanitized } = sanitize(markdownContent);
    fs.writeFileSync(filepath, sanitized, 'utf-8');

    return filepath;
  }

  /**
   * Calls Google Gemini REST API using fetch (native Node 18+).
   */
  private async callGeminiApi(telemetry: FailureTelemetry): Promise<string> {
    const primaryModel = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
    const fallbackModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
    const modelsToTry = [primaryModel, ...fallbackModels.filter((m) => m !== primaryModel)];




    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: this.buildPrompt(telemetry) }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error for model ${model} (status ${response.status}): ${errorText}`);
        }

        const data = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!generatedText) {
          throw new Error(`Gemini API returned empty response structure for model ${model}`);
        }

        return generatedText;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[BugReporter] Failed with model ${model}: ${lastError.message}`);
      }
    }

    throw lastError ?? new Error('Failed to generate bug report with any Gemini model');
  }

  private buildPrompt(telemetry: FailureTelemetry): string {
    return `You are a Senior QA Automation Engineer. Generate a clear, structured Markdown bug report draft from this automated E2E test failure.

Rules:
1. Output ONLY the raw Markdown bug report content.
2. Include sections: Title, Severity, Environment, URL, Symptom / Error, Steps to Reproduce, Console Errors, Failed Network Requests, Sanitized DOM Snippet, Root Cause Analysis, and Recommended Next Steps.
3. NEVER invent secrets, credentials, or personal details.
4. Keep output actionable and concise.

Test Failure Context:
- Test Title: ${telemetry.testTitle}
- Target URL: ${telemetry.currentUrl}
- Error Message: ${telemetry.errorMessage}
- Timestamp: ${telemetry.timestamp}
- Screenshot Path: ${telemetry.screenshotPath ?? 'N/A'}
- Trace Path: ${telemetry.tracePath ?? 'N/A'}
- Console Logs (${telemetry.consoleLogs.length}):
${telemetry.consoleLogs.map((l) => `  [${l.type}] ${l.text}`).join('\n')}

- Failed HTTP Responses (${telemetry.failedResponses.length}):
${telemetry.failedResponses
  .map((r) => `  [${r.method}] ${r.status} ${r.url} - ${r.responseBody ?? ''}`)
  .join('\n')}

- Sanitized DOM Snippet:
\`\`\`html
${telemetry.sanitizedDomSnippet}
\`\`\`
`;
  }


  /**
   * Fallback Markdown generation when LLM is unavailable.
   */
  private generateFallbackMarkdown(telemetry: FailureTelemetry, note: string): string {
    return `# [BUG DRAFT] E2E Test Failure: ${telemetry.testTitle}

> **Note:** ${note}

## Overview
- **Test Title:** ${telemetry.testTitle}
- **Timestamp:** ${telemetry.timestamp}
- **Target URL:** \`${telemetry.currentUrl}\`
- **Screenshot Path:** \`${telemetry.screenshotPath ?? 'N/A'}\`
- **Trace Path:** \`${telemetry.tracePath ?? 'N/A'}\`

## Error Message
\`\`\`
${telemetry.errorMessage}
\`\`\`

## Console Errors
${
  telemetry.consoleLogs.length > 0
    ? telemetry.consoleLogs.map((l) => `- \`[${l.type}]\` ${l.text}`).join('\n')
    : '_No console errors captured._'
}

## Failed HTTP Responses
${
  telemetry.failedResponses.length > 0
    ? telemetry.failedResponses
        .map(
          (r) =>
            `- **[${r.method}] ${r.status} ${r.statusText}** - \`${r.url}\`\n  - Body: \`${r.responseBody ?? 'N/A'}\``
        )
        .join('\n')
    : '_No failed HTTP responses captured._'
}

## DOM Context (Sanitized)
\`\`\`html
${telemetry.sanitizedDomSnippet}
\`\`\`

## Suggested Actions
1. Review the screenshot at \`${telemetry.screenshotPath ?? 'N/A'}\`.
2. Inspect the Playwright trace using \`npx playwright show-trace ${telemetry.tracePath ?? '<trace-file>'}\`.
3. Check the console and network errors listed above.
`;
  }
}
