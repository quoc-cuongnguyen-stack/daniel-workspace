# Bug Case BUG-024: PostHog Reporting Unhandled TypeError: Failed to Fetch on Apollo Client Subscription Aborts & Network Blips

**Date**: 2026-07-29
**Status**: ✅ Resolved
**Severity**: Low / Noise Reduction
**Impacted Service**: `ssl-fe-user`

---

## 1. Symptom

PostHog Error Tracking reported multiple instances of `TypeError: Failed to fetch` occurring between 23:00 ICT and 01:30 ICT (16:00 UTC – 18:30 UTC).
Stack traces indicated the origin was `e.subscribe` inside Next.js chunk bundles (e.g. `0~gdpwdf607ka.js`). Affected users were primarily from Denmark (DK), France (FR), and Vietnam (VN) navigating pages such as `/da/message`, `/en/search`, and `/en/dashboard`.

---

## 2. Root Cause Analysis

1. **Apollo Client Subscription Aborts**: In `@apollo/client` (v4.1.6), `e.subscribe` handles GraphQL subscriptions and observable queries. When users navigate away from a page, close a tab, or experience transient network reconnects while an active subscription/fetch is pending, `window.fetch()` or WebSocket streams abort and throw `TypeError: Failed to fetch`.
2. **Unhandled Console/PostHog Logging**: In `LayoutWrapper` (`src/shared/layout/wrapper.tsx`), `_handleApolloError` logged all errors via `console.error('Apollo Error:', error)`. Furthermore, `instrumentation-client.ts` had `capture_exceptions: true` without filtering out benign network fetch aborts, causing PostHog to record these transient client-side network aborts as unhandled application errors.

---

## 3. Resolution & Code Changes

1. **Created Utility Helper**: Added `isIgnoredNetworkError` in `src/shared/util/network-error.ts` to identify benign network fetch aborts (`Failed to fetch`, `NetworkError when attempting to fetch resource`, `Load failed`, `Fetch is aborted`).
2. **Updated LayoutWrapper (`src/shared/layout/wrapper.tsx`)**: Ignored network fetch aborts in `_handleApolloError` to avoid logging them to `console.error`.
3. **Updated PostHog Client (`instrumentation-client.ts`)**: Added `before_send` filter to `posthog.init` to drop `$exception` events matching transient fetch aborts before sending them to PostHog.
4. **Added Unit Tests**: Created `src/shared/util/network-error.test.unit.ts` covering positive and negative matches for `isIgnoredNetworkError`.

---

## 4. Verification

- Ran unit tests: `pnpm test:unit src/shared/util/network-error.test.unit.ts` (4/4 passed).
- Ran ESLint: `pnpm eslint src/shared/util/network-error.ts src/shared/util/network-error.test.unit.ts src/shared/layout/wrapper.tsx instrumentation-client.ts --fix` (0 errors).
