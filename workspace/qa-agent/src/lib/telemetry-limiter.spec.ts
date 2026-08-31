import { describe, it, expect } from 'vitest';
import { truncateText, applyLimits } from './telemetry-limiter';

describe('Telemetry Limiter Unit Tests', () => {
  it('does not truncate strings within limit', () => {
    const input = 'Short text within limit';
    const { text, wasTruncated } = truncateText(input, 100);
    expect(text).toBe(input);
    expect(wasTruncated).toBe(false);
  });

  it('truncates strings that exceed limit and appends truncation marker', () => {
    const input = 'A'.repeat(500);
    const { text, wasTruncated } = truncateText(input, 100);
    expect(wasTruncated).toBe(true);
    expect(text.length).toBeLessThanOrEqual(100);
    expect(text).toContain('... [TRUNCATED] ...');
  });

  it('applies limits to structured payload', () => {
    const payload = {
      domContext: '<div>' + 'x'.repeat(10_000) + '</div>',
      consoleErrors: 'ERROR: ' + 'e'.repeat(5_000),
      failedResponses: Array.from({ length: 20 }, (_, i) => ({
        url: `https://example.com/api/${i}`,
        status: 500,
        body: 'B'.repeat(3_000),
      })),
    };

    const { limited, stats } = applyLimits(payload, {
      maxDomSnippetChars: 500,
      maxConsoleChars: 200,
      maxFailedResponses: 3,
      maxResponseBodyChars: 100,
    });

    expect((limited.domContext as string).length).toBeLessThanOrEqual(500);
    expect((limited.consoleErrors as string).length).toBeLessThanOrEqual(200);
    expect((limited.failedResponses as Array<unknown>).length).toBe(3);
    expect(stats.truncations).toBeGreaterThan(0);
  });
});
