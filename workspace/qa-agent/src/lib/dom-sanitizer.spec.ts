import { describe, it, expect } from 'vitest';
import { sanitizeDomContent } from './dom-sanitizer';

describe('DOM Sanitizer Unit Tests', () => {
  it('strips script, style, and svg elements completely', () => {
    const html = `
      <div>
        <script>console.log('secret', 'password123');</script>
        <style>body { color: red; }</style>
        <svg><path d="M0 0h10v10H0z"/></svg>
        <p>Public Text</p>
      </div>
    `;
    const sanitized = sanitizeDomContent(html);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<style>');
    expect(sanitized).not.toContain('<svg>');
    expect(sanitized).not.toContain('password123');
    expect(sanitized).toContain('<p>Public Text</p>');
  });

  it('redacts password input values in DOM string', () => {
    const html = '<form><input type="password" name="password" value="mySecretPassword123" /></form>';
    const sanitized = sanitizeDomContent(html);
    expect(sanitized).not.toContain('mySecretPassword123');
    expect(sanitized).toContain('[REDACTED_INPUT_VALUE]');
  });

  it('truncates base64 data URLs', () => {
    const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />';
    const sanitized = sanitizeDomContent(html);
    expect(sanitized).not.toContain('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    expect(sanitized).toContain('[TRUNCATED_BASE64]');
  });
});
