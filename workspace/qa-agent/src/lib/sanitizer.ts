/**
 * Sanitizer: strips sensitive data (passwords, tokens, cookies, API keys,
 * authorization headers, emails, session IDs, PII) from arbitrary strings
 * before they can be sent to any external service or LLM.
 */

/** Patterns that match sensitive values in text. */
const REDACTION_PATTERNS: { label: string; pattern: RegExp }[] = [
  // Authorization header lines (e.g. Authorization: Bearer ...)
  { label: '[REDACTED_AUTH_HEADER]', pattern: /(?:authorization\s*:\s*)?(?:Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi },
  // JWT-shaped tokens (header.payload.signature)
  { label: '[REDACTED_JWT]', pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  // Generic API keys (32+ hex or base64 chars)
  { label: '[REDACTED_API_KEY]', pattern: /(?:api[_-]?key|apikey|token|secret)\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]{16,}["']?/gi },
  // Password field values in form data or JSON
  { label: '[REDACTED_PASSWORD]', pattern: /(?:"?(?:password|passwd|pwd)"?\s*[:=]\s*)"[^"]+"/gi },
  // Unquoted password field values
  { label: '[REDACTED_PASSWORD]', pattern: /(?:"?(?:password|passwd|pwd)"?\s*[:=]\s*)(?:[^\s,"'}&]+)/gi },
  // Cookie header values
  { label: '[REDACTED_COOKIE]', pattern: /(?:cookie|set-cookie)\s*:\s*[^\r\n]+/gi },
  // Email addresses
  { label: '[REDACTED_EMAIL]', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  // Generic Authorization headers
  { label: '[REDACTED_AUTH]', pattern: /authorization\s*:\s*[^\r\n]+/gi },
  // Session IDs (common patterns)
  { label: '[REDACTED_SESSION]', pattern: /(?:session[_-]?id|sid|connect\.sid)\s*[=:]\s*["']?[A-Za-z0-9\-._~+/]{16,}["']?/gi },
  // Credit card numbers (basic Luhn-length sequences)
  { label: '[REDACTED_CC]', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
  // SSN
  { label: '[REDACTED_SSN]', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
];


/**
 * Strip all known sensitive patterns from the input string.
 * Returns { sanitized, redactionCount }.
 */
export function sanitize(input: string): { sanitized: string; redactionCount: number } {
  let sanitized = input;
  let redactionCount = 0;

  for (const { label, pattern } of REDACTION_PATTERNS) {
    // Reset lastIndex for stateful (global) regexes
    pattern.lastIndex = 0;
    const matches = sanitized.match(pattern);
    if (matches) {
      redactionCount += matches.length;
      sanitized = sanitized.replace(pattern, label);
    }
  }

  return { sanitized, redactionCount };
}

/**
 * Sanitize key-value pairs (e.g., HTTP headers).
 * Strips values of sensitive headers entirely.
 */
const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'proxy-authorization',
]);

export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitize(value).sanitized;
    }
  }
  return result;
}
