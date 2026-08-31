# CARD-900: Age verification latency

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-11
> **Date Fixed:** 2026-08-11
> **Project:** SSL
> **Severity:** 🟡 Medium

## 🔍 Description

Passport age verification completed successfully, but the user remained on the verification loading state for a long time. The frontend waits for the `verifyAge` mutation before advancing, while the backend added the latency of several independent remote operations.

## 🔄 Reproduction Steps

1. Start age verification with the passport method.
2. Upload a passport image and a selfie.
3. Submit the verification.
4. Observe the loading state until all AWS analysis, image upload, database, and notification work finishes.

**Expected behavior:** Independent analysis and upload operations should overlap so the user waits only for the longest required branch.

**Actual behavior:** Document face detection, ID analysis, selfie detection, face comparison, and two image uploads were awaited mostly in sequence.

## 📸 Evidence

Card-900 reports that verification succeeded but took a long time. The linked PostHog recording is `019fb53c-8ba0-7edf-bffa-8b41b41f71a3`. The final age-verification interaction occurs around 23:03:39 UTC, followed by about 199 seconds without another captured interaction before the sign-up page reloads at 23:06:59. The user reaches the dashboard at 23:08:30.

## 🔭 Tracing Evidence

**Jaeger Trace IDs:** None. The local Jaeger check failed because Docker Desktop was not running.

**Key Observations:** No local production-correlated span timing was available. The source path and deferred-promise regression tests confirm that the independent remote requests were serialized before this fix.

## 📊 PostHog Evidence

**Session Recording:** [Card-900 shared replay](https://eu.posthog.com/shared/J-UDtf1OCMVjbWFf2NrlggeU8Gpz6g?t=739)

**Recording ID:** `019fb53c-8ba0-7edf-bffa-8b41b41f71a3`

**User Journey:**

1. The user submits the passport and selfie at the age-verification step.
2. The frontend sets `isVerifying` and waits for the GraphQL mutation.
3. No further interaction is captured for about 199 seconds.
4. The sign-up page reloads, and the user reaches the dashboard about 91 seconds later.

The recording contains three console errors. The error at the end of the delay window is minified React hydration error 418. It occurs at reload and does not identify an age-verification API failure or explain the preceding backend wait. PostHog captured no Replay Vision observations for this recording.

## 🧠 Root Cause Analysis

The frontend correctly awaits one `verifyAge` mutation and advances only after it resolves. The delay originated in the backend:

- `verifyAgeDocument` awaited Rekognition face detection before starting Textract ID analysis, although both consume the same image and are independent.
- `compareFaces` awaited document verification before starting selfie verification, although the two checks use separate images.
- `compareFaces` buffered the document and selfie in sequence before the final face comparison.
- `authnCtr.verifyAge` uploaded the document and selfie in sequence.
- Replacement of prior verification images deleted the two old files in sequence.

This made total latency approximate the sum of each remote call instead of the longest call in each independent group.

**Related files:**

- [rekognition.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/aws/rekognition/rekognition.controller.ts)
- [authn.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/authn/authn.controller.ts)
- [3.age-verification.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/auth/sign-up/component/3.age-verification.tsx)

## 🔧 Fix Applied

- Start document face detection and Textract ID analysis with `Promise.all`.
- Start document and selfie verification with `Promise.all` before face comparison.
- Buffer both comparison images concurrently.
- Upload both verification images concurrently.
- Delete both superseded verification images concurrently.

The verification rules, fallback-to-manual-review behavior, persisted status, and frontend flow remain unchanged.

## 🧪 Unit / Regression Test

- **Test File:** [rekognition.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/aws/rekognition/rekognition.controller.test.ts)
- **Command:** `pnpm test src/modules/aws/rekognition/rekognition.controller.test.ts`
- **Test Results:** 2 tests passed. Deferred promises prove document face detection and ID analysis start concurrently, and document and selfie verification start concurrently before face comparison.
- **Backend build:** `pnpm build` passed with Node 24.18.0.
- **Changed-file lint:** direct ESLint passed for both changed controllers and the regression test. The repository `cyberskill lint` wrapper could not complete because its dependency-version lookup failed and incorrectly attempted to write empty package versions; those manifest changes were reverted.
- **QA build/unit/lint:** passed (12 unit tests).
- **QA E2E:** 1 passed and 2 skipped. The smoke suite does not contain an age-verification scenario, so it confirms the existing app smoke path but is not proof of a production passport submission.

## 📝 Lessons Learned

- Independent external calls in a user-blocking mutation should be grouped explicitly.
- Latency regression tests should assert start order with deferred promises instead of relying on wall-clock thresholds.
- Age-verification timing should be captured as spans or product events so production regressions can be attributed without replay-only inspection.

## 🔗 References

- Card: [Card-900](https://app.superthread.com/cnlgaming/card-900-fb-age-verification-review)
- PostHog: [shared replay](https://eu.posthog.com/shared/J-UDtf1OCMVjbWFf2NrlggeU8Gpz6g?t=739)
- Knowledge item: `/Users/daniel/.gemini/antigravity-ide/knowledge/age-verification-latency/`
