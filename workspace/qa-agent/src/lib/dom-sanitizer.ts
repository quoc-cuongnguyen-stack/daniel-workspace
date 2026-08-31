import { sanitize } from './sanitizer';

/**
 * Extracts a sanitized DOM representation suitable for LLM analysis.
 * Removes heavy/irrelevant tags (<script>, <style>, <svg>, <path>, <canvas>, <iframe>),
 * redacts text content, strips sensitive input values, and keeps essential layout & ARIA semantics.
 */
export function sanitizeDomContent(html: string): string {
  if (!html) return '';

  let dom = html;

  // 1. Remove script, style, svg, canvas, video, audio, iframe elements and contents
  dom = dom.replace(/<(script|style|svg|canvas|video|audio|iframe|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // 2. Remove self-closing svg/img/meta/link tags if heavy
  dom = dom.replace(/<svg[^>]*\/>/gi, '');

  // 3. Redact value attributes of sensitive inputs (password, text, token, email, secret, etc.)
  dom = dom.replace(
    /(<input[^>]*type=["']?(?:password|text|email|hidden|search|tel)["']?[^>]*value=["'])([^"']*)/gi,
    (_match, prefix, _val) => `${prefix}[REDACTED_INPUT_VALUE]`
  );

  // 4. Redact value attributes on any input with sensitive name/id/autocomplete
  dom = dom.replace(
    /(<input[^>]*(?:name|id|autocomplete|aria-label)=["']?[^"']*(?:password|pass|pwd|token|secret|auth|credit|card|ssn)[^"']*["']?[^>]*value=["'])([^"']*)/gi,
    (_match, prefix, _val) => `${prefix}[REDACTED_INPUT_VALUE]`
  );

  // 5. Remove long base64 inline data URLs (e.g. img src="data:image/png;base64,...")
  dom = dom.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g, 'data:image/...[TRUNCATED_BASE64]');

  // 6. Run standard text sanitizer across full markup (removes emails, JWTs, headers, secrets)
  const { sanitized } = sanitize(dom);
  dom = sanitized;

  // 7. Collapse excess whitespace and blank lines to reduce token usage
  dom = dom
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return dom;
}
