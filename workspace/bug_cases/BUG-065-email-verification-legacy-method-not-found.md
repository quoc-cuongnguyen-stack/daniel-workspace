# BUG-065: Pasted email OTP is submitted twice

> **Status:** Fixed
> **Date Found:** 2026-08-14
> **Date Fixed:** 2026-08-14
> **Project:** SSL frontend
> **Severity:** High

## Description

After a user pasted a valid email verification code, registration advanced to "Create your profile", then displayed "Verification not found". The error came from a second verification request, not the request that completed the verification step.

## Reproduction steps

1. Register a new account and request an email OTP.
2. Paste the full six-character OTP into the split verification input.
3. Observe that the profile creation step appears, followed by the error modal.

**Expected behavior:** The pasted OTP is submitted once and registration advances without an error.

**Actual behavior:** Two paste-like input events can schedule two submissions. The first succeeds and deletes the consumed verification record. The second then reports "Verification not found".

## Evidence

The supplied screenshot shows the error modal over the "Create your profile" screen. This proves the first request already advanced registration before the error appeared.

```text
Oopsie...
Verification not found.
```

## Tracing evidence

Jaeger was unavailable during the local investigation. No trace ID was collected.

## PostHog evidence

No user identity, timestamp, or PostHog recording link was supplied, so no matching session could be queried.

## Root cause analysis

`VerificationCodeInput` handled paste, `beforeinput`, and multi-character change events through the same OTP application path. Each full-code event created its own delayed auto-submit callback. Some browsers emit more than one paste-like event for one paste action, allowing duplicate `registerVerifyEmail` mutations.

The first backend request validates the OTP, deletes its verification record, and changes `registerStep` to personal information. The duplicate request then correctly fails because that one-time record has already been consumed.

**Related files:**
- [verification-code-input.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/verification-code-input.tsx)
- [verification-code-input.test.unit.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/verification-code-input.test.unit.tsx)

## Fix applied

The component now keeps one pending auto-submit timeout. A later paste-like event clears and replaces the pending callback, so one pasted OTP produces one mutation. Unmounting also clears the pending callback.

The earlier backend compatibility fallback was reverted because current OTP creation already stores `method: EMAIL_OTP`; it did not explain an error displayed after registration had advanced.

## Unit / regression test

- **Test file:** [verification-code-input.test.unit.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/verification-code-input.test.unit.tsx)
- **Command:** `pnpm --prefix ssl-fe-user test:unit -- src/shared/component/verification-code-input.test.unit.tsx`
- **Assertion:** Two immediate paste-like events containing the same full OTP result in one `onSubmit` call.

## Lessons learned

- A one-time-code UI must coalesce browser paste, autofill, and input events before calling a consuming API.
- The screen visible behind an error modal can reveal that an earlier request already succeeded.

## References

- Related work: TASK-933 mobile OTP paste support
- Conversation: desktop-6a8a6347-50d6-4c98-b587-baf98db71ebb
- Jaeger traces: unavailable
- PostHog recordings: unavailable
