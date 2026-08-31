/**
 * Telemetry size limiter: ensures data sent to the LLM stays within
 * configurable byte/character budgets. Truncates with a marker when exceeded.
 */

export interface TelemetryLimits {
  /** Max characters for the full context payload. Default: 60_000 (~15k tokens). */
  maxContextChars: number;
  /** Max characters for a single DOM snippet. Default: 8_000. */
  maxDomSnippetChars: number;
  /** Max characters for console log output. Default: 4_000. */
  maxConsoleChars: number;
  /** Max number of failed HTTP responses to include. Default: 10. */
  maxFailedResponses: number;
  /** Max characters for a single HTTP response body. Default: 2_000. */
  maxResponseBodyChars: number;
}

const DEFAULT_LIMITS: TelemetryLimits = {
  maxContextChars: 60_000,
  maxDomSnippetChars: 8_000,
  maxConsoleChars: 4_000,
  maxFailedResponses: 10,
  maxResponseBodyChars: 2_000,
};

const TRUNCATION_MARKER = '\n... [TRUNCATED] ...';

/**
 * Truncate a string to maxChars, appending a marker if truncated.
 * Returns { text, wasTruncated }.
 */
export function truncateText(
  input: string,
  maxChars: number,
): { text: string; wasTruncated: boolean } {
  if (input.length <= maxChars) {
    return { text: input, wasTruncated: false };
  }
  const cutoff = maxChars - TRUNCATION_MARKER.length;
  return {
    text: input.slice(0, Math.max(0, cutoff)) + TRUNCATION_MARKER,
    wasTruncated: true,
  };
}

/**
 * Apply limits to a structured telemetry payload.
 */
export function applyLimits(
  payload: {
    domContext?: string;
    consoleErrors?: string;
    failedResponses?: Array<{ url: string; status: number; body?: string }>;
    [key: string]: unknown;
  },
  overrides?: Partial<TelemetryLimits>,
): {
  limited: typeof payload;
  stats: { totalChars: number; truncations: number };
} {
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  let truncations = 0;

  const limited = { ...payload };

  // Truncate DOM context
  if (limited.domContext) {
    const result = truncateText(limited.domContext, limits.maxDomSnippetChars);
    limited.domContext = result.text;
    if (result.wasTruncated) truncations++;
  }

  // Truncate console errors
  if (limited.consoleErrors) {
    const result = truncateText(limited.consoleErrors, limits.maxConsoleChars);
    limited.consoleErrors = result.text;
    if (result.wasTruncated) truncations++;
  }

  // Limit failed responses count and body size
  if (limited.failedResponses) {
    limited.failedResponses = limited.failedResponses
      .slice(0, limits.maxFailedResponses)
      .map((resp) => {
        if (resp.body) {
          const result = truncateText(resp.body, limits.maxResponseBodyChars);
          if (result.wasTruncated) truncations++;
          return { ...resp, body: result.text };
        }
        return resp;
      });
  }

  // Final overall context size check
  const serialized = JSON.stringify(limited);
  const totalChars = serialized.length;

  if (totalChars > limits.maxContextChars) {
    // Aggressively truncate the largest field (domContext) further
    if (limited.domContext) {
      const overflow = totalChars - limits.maxContextChars;
      const newMax = Math.max(200, limited.domContext.length - overflow - 100);
      const result = truncateText(limited.domContext, newMax);
      limited.domContext = result.text;
      if (result.wasTruncated) truncations++;
    }
  }

  return {
    limited,
    stats: {
      totalChars: JSON.stringify(limited).length,
      truncations,
    },
  };
}

export { DEFAULT_LIMITS };
