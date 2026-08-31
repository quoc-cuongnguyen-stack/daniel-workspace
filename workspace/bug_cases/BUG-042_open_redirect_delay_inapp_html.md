# BUG-042: Open Redirect Page Delay Stuck at 5 Seconds Due to Un-updated Static inapp.html Rewrite

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-05
> **Date Fixed:** 2026-08-05
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟡 Medium

---

## 🔍 Description

When accessing `https://www.secretswingerlust.com/open`, the redirect page continued to display a 5-second countdown timer instead of the updated 2-second delay. Although `src/app/[locale]/(blank)/inapp/page.tsx` was modified to use a 2-second delay, requests to `/open` are rewritten at the Next.js `beforeFiles` layer to serve `public/inapp.html` directly. The static HTML file `public/inapp.html` contained hardcoded 5-second countdown values in both its DOM markup and inline JavaScript logic.

## 🔄 Reproduction Steps

1. Navigate to `https://www.secretswingerlust.com/open` (or `/open` on local dev server).
2. Observe the redirect countdown display.

**Expected behavior:** The countdown starts at 2 seconds and redirects after 2 seconds.
**Actual behavior:** The page displays "Opening in 5 seconds..." and waits 5 seconds before redirecting.

## 📸 Evidence

In `public/inapp.html` (lines 741, 743, 868, 890, 920):
```html
<span class="countdown-number" id="countdown">5</span>
<p class="countdown-text">Opening in <span id="countdown-label">5</span> seconds...</p>
```
```js
var seconds = 5;
...
circle.style.strokeDashoffset = totalLength * ((5 - seconds) / 5);
...
var desktopSeconds = 5;
```

In `next.config.mjs` (line 56):
```js
beforeFiles: [
    { source: '/open', destination: '/inapp.html' },
]
```

## 🔭 Tracing Evidence

N/A - Pure frontend routing and static asset rewrite issue.

## 📊 PostHog Evidence

N/A - Client-side static page delay discrepancy reported post-deployment.

## 🧠 Root Cause Analysis

Next.js configured a `beforeFiles` rewrite in `next.config.mjs` matching `{ source: '/open', destination: '/inapp.html' }`. Because `beforeFiles` rewrites take precedence over standard Next.js page routes (`src/app/open/page.tsx` or `src/app/[locale]/(blank)/inapp/page.tsx`), requests to `/open` bypass the React page component and serve static `/inapp.html` directly from the `public/` directory.

When the developer updated the redirect delay in `src/app/[locale]/(blank)/inapp/page.tsx`, `public/inapp.html` was not updated and remained hardcoded to 5 seconds.

**Related files:**
- [next.config.mjs](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/next.config.mjs)
- [inapp.html](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/public/inapp.html)
- [page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/%5Blocale%5D/%28blank%29/inapp/page.tsx)

## 🔧 Fix Applied

Updated `public/inapp.html` to reflect the 2-second delay:
1. Replaced hardcoded DOM countdown values `5` with `2`.
2. Initialized `initialSeconds = 2` and updated the SVG circle progress calculation `(initialSeconds - seconds) / initialSeconds`.
3. Updated `desktopSeconds = 2` for desktop browser fallback redirects.

```diff
- <span class="countdown-number" id="countdown">5</span>
- <p class="countdown-text">Opening in <span id="countdown-label">5</span> seconds...</p>
+ <span class="countdown-number" id="countdown">2</span>
+ <p class="countdown-text">Opening in <span id="countdown-label">2</span> seconds...</p>

- var seconds = 5;
+ var initialSeconds = 2;
+ var seconds = initialSeconds;

- var desktopSeconds = 5;
+ var desktopSeconds = 2;
```

## 🧪 Unit / Regression Test

- **Test File:** [open.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/open/open.test.unit.ts)
- **Command:** `pnpm --filter ssl-fe-user test:unit src/app/open/open.test.unit.ts`
- **Test Results:** Verified `public/inapp.html` contains the 2-second countdown values (`id="countdown">2`, `initialSeconds = 2`, `desktopSeconds = 2`) and does not contain legacy 5-second values. Clean pass (2 tests passed).

## 📝 Lessons Learned

- When static HTML files in `public/` are used as targets for Next.js rewrites (e.g. for low-overhead landing pages), any changes to corresponding React routes or landing settings must also be synced to the static files.
- Automated unit tests should check public static assets linked to rewrites to catch divergence early.

## 🔗 References

- Related bug cases: N/A
