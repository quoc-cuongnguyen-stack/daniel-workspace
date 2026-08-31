# TASK-933 follow-up: Mobile OTP paste fills only the first character

> **Status:** Fixed
> **Date Found:** 2026-08-12
> **Date Fixed:** 2026-08-12
> **Project:** ssl-fe-user
> **Severity:** Medium

## Description

On mobile, pasting a full signup OTP into the split verification inputs only populated the first cell.

## Reproduction Steps

1. Open signup email verification on a mobile browser.
2. Copy the full 6-character OTP from email.
3. Paste into the verification inputs.

**Expected behavior:** All six cells fill and auto-submit when enabled.
**Actual behavior:** Only the first character appears.

## Root Cause Analysis

1. Many mobile WebViews fire `paste` with empty `clipboardData`, so the earlier paste handler sanitized an empty string and did nothing useful.
2. The full code sometimes arrived via `beforeinput` (`insertFromPaste`) or a multi-character `change`, which needed a shared apply path.
3. Every cell used `autocomplete="one-time-code"`, which encouraged the OS to autofill a single character into the first box.

**Related files:**
- [verification-code-input.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/verification-code-input.tsx)
- [verification-code-input.test.unit.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/verification-code-input.test.unit.tsx)

## Fix Applied

- Centralized OTP apply helper for paste, beforeinput, and multi-character change.
- Read both `text/plain` and `text` from clipboardData; fall back to `navigator.clipboard.readText()` when empty.
- Handle `beforeinput` paste-like input types.
- Restrict `autocomplete="one-time-code"` to the first cell only.

## Verification

- `pnpm run test:unit -- src/shared/component/verification-code-input.test.unit.tsx`: PASSED
- `pnpm exec cyberskill lint` in ssl-fe-user: PASSED (exit 0; pre-existing warnings only)
