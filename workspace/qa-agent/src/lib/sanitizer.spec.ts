import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeHeaders } from './sanitizer';

describe('Sanitizer Unit Tests', () => {
  it('redacts Bearer and Basic authorization tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const { sanitized, redactionCount } = sanitize(input);
    expect(sanitized).not.toContain('eyJhbGci');
    expect(sanitized).toContain('[REDACTED_AUTH_HEADER]');
    expect(redactionCount).toBeGreaterThan(0);
  });

  it('redacts standalone JWT tokens', () => {
    const input = 'Here is a token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotExposeThisSignatureValue12345';
    const { sanitized } = sanitize(input);
    expect(sanitized).not.toContain('doNotExposeThisSignatureValue12345');
    expect(sanitized).toContain('[REDACTED_JWT]');
  });

  it('redacts passwords in text and JSON strings', () => {
    const input = '{"username": "user1", "password": "superSecretPassword123!"}';
    const { sanitized } = sanitize(input);
    expect(sanitized).not.toContain('superSecretPassword123!');
    expect(sanitized).toContain('[REDACTED_PASSWORD]');
  });

  it('redacts email addresses', () => {
    const input = 'Contact support at user.john@example.com for help.';
    const { sanitized } = sanitize(input);
    expect(sanitized).not.toContain('user.john@example.com');
    expect(sanitized).toContain('[REDACTED_EMAIL]');
  });

  it('redacts cookie strings', () => {
    const input = 'Cookie: sessionid=abc123xyz456secret; Path=/; Secure';
    const { sanitized } = sanitize(input);
    expect(sanitized).not.toContain('sessionid=abc123xyz456secret');
    expect(sanitized).toContain('[REDACTED_COOKIE]');
  });

  it('sanitizes headers dictionary, stripping sensitive header values completely', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer secret_token_1234567890',
      Cookie: 'session=xyz987654321',
      'X-Custom-Header': 'public-info',
    };
    const sanitized = sanitizeHeaders(headers);
    expect(sanitized['Content-Type']).toBe('application/json');
    expect(sanitized['Authorization']).toBe('[REDACTED]');
    expect(sanitized['Cookie']).toBe('[REDACTED]');
    expect(sanitized['X-Custom-Header']).toBe('public-info');
  });
});
