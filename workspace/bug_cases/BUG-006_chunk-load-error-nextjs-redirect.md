# BUG-006: ChunkLoadError On Redirect Uncaught By ChunkErrorHandler

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** ssl-fe-user
> **Severity:** 🟠 High

---

## 🔍 Description

When navigating/redirecting across pages (e.g. clicking notification redirect to `/message`), Next.js dynamically loads component JS chunks. If a new deployment occurs while the user has an active session open, old chunk filenames no longer exist on CDN/server, throwing a Next.js `ChunkLoadError` (`Failed to load chunk /_next/static/chunks/...`). The application's `ChunkErrorHandler` failed to detect the error string, causing the application to show the red fallback error page (`error.tsx`) instead of auto-reloading to fetch the latest build manifest.

## 🔄 Reproduction Steps

1. Keep a browser tab open on `https://secretswingerlust.com`.
2. Deploy a new version of the Next.js app to CDN/server.
3. Click a notification or route link to redirect to another page (e.g. `/message`).
4. Next.js attempts to fetch an old dynamic chunk that returned 404.

**Expected behavior:** `ChunkErrorHandler` catches `Failed to load chunk`, automatically reloads the page once (`window.location.reload()`) to load fresh deployment assets.
**Actual behavior:** `ChunkErrorHandler` pattern check returned `false`, propagating the error to Next.js `error.tsx` boundary displaying "Failed to load chunk /_next/static/chunks/...".

## 📸 Evidence

```
TECHNICAL DETAILS
Failed to load chunk /_next/static/chunks/158yvuio.pwsd.js from module 28594
PostHog Replay: 019f83ab-55b3-7762-b3a4-7b9597327168
```

## 🧠 Root Cause Analysis

In `ssl-fe-user/src/shared/component/ui/chunk-error-handler.tsx`, `CHUNK_ERROR_PATTERNS` only matched:
- `'ChunkLoadError'`
- `'Loading chunk'`
- `'Failed to fetch dynamically imported module'`
- `'Loading CSS chunk'`

The string thrown by Next.js Turbopack / Webpack dynamic imports is `"Failed to load chunk /_next/static/chunks/..."`. Because `'Failed to load chunk'` was missing from `CHUNK_ERROR_PATTERNS`, `isChunkError()` returned `false`.

**Related files:**
- [chunk-error-handler.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/chunk-error-handler.tsx)

## 🔧 Fix Applied

Added `'Failed to load chunk'` to `CHUNK_ERROR_PATTERNS` in [chunk-error-handler.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/chunk-error-handler.tsx).

```diff
 const CHUNK_ERROR_PATTERNS = [
     'ChunkLoadError',
     'Loading chunk',
+    'Failed to load chunk',
     'Failed to fetch dynamically imported module',
     'Loading CSS chunk',
 ] as const;
```

## 📝 Lessons Learned

- Ensure chunk error recovery patterns cover all variations produced by Next.js / Webpack / Turbopack (`Failed to load chunk`).
- Automatically reloading on chunk error ensures seamless user recovery when fresh deployments purge old CDN chunks.

## 🔗 References

- PostHog Session: [Replay 019f83ab-55b3-7762-b3a4-7b9597327168](https://eu.posthog.com/project/108852/replay/019f83ab-55b3-7762-b3a4-7b9597327168)
