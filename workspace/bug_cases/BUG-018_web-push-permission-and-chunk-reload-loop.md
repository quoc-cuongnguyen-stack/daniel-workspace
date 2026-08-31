# BUG-018: Web Push Permission State & Chunk Reload Timeout Loop

**Date**: 2026-07-24  
**Project**: SSL-FE-User (Task #356)  
**Status**: ✅ Fixed  

---

## Symptom
1. When browser denied notification permission (`Notification.permission === 'denied'`), the notification switch in settings remained disabled and unclickable, but did not provide feedback when clicked.
2. Visiting notification settings or changing permissions caused the app to reload repeatedly or get stuck on a full-screen red spinner with text **"Loading a fresh version…"**.

---

## Root Cause

1. **Service Worker Promise Hang**: In `push-notification.hook.ts`, `checkSubscription` awaited `navigator.serviceWorker.ready` unconditionally. When no service worker was active or registered, `navigator.serviceWorker.ready` returned a Promise that never resolved, causing `loading` to stay `true` forever.
2. **Generic Error Pattern in Error Boundary**: In `chunk-error.ts`, `RECOVERABLE_ERROR_PATTERNS` included `'timeout'`. Any timeout (e.g. service worker check timeout, network request timeout) triggered `isRecoverableError` in Next.js `error.tsx`, causing `error.tsx` to render `<p>Loading a fresh version…</p>` and call `window.location.reload()`. Since the underlying error wasn't a bundle chunk mismatch, the reload repeated or stymied user navigation.

---

## Resolution

1. **`push-notification.hook.ts`**:
   - Checked `Notification.permission` first. If `permission === 'denied'`, set `isSubscribed = false` and `loading = false` immediately without waiting for service worker.
   - Wrapped `navigator.serviceWorker.ready` in a 3-second `Promise.race` timeout so subscription checks never hang.
2. **`notification-setting.page.tsx` & `switch.tsx`**:
   - Added `disabled` prop support to `Switch`.
   - Added toast feedback (`toastError({ message: t('settings.push-denied-help') })`) when clicking the switch while notification permission is denied by the browser.
3. **`chunk-error.ts`**:
   - Removed generic `'timeout'`, `'NetworkError'`, `'Failed to fetch'` from `RECOVERABLE_ERROR_PATTERNS`, keeping it focused strictly on genuine bundle and translation loading failures (`ChunkLoadError`, `error loading translation`, etc.).
   - Added unit test suite `chunk-error.test.ts`.
