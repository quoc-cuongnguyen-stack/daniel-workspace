# BUG-040: GET /[locale] (e.g. /en) Returns 404 in Next.js Turbopack

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-05
> **Date Fixed:** 2026-08-05
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🔴 Critical

---

## 🔍 Description

Requests to `GET /[locale]` (e.g. `GET /en` or `GET /da`) returned a 404 Not Found response (`404: This page could not be found`).

## 🔄 Reproduction Steps

1. Launch `ssl-fe-user` using Next.js 16 with Turbopack (`next dev --turbopack`).
2. Make a request to `GET /en` or `http://localhost:8001/en`.
3. Next.js router delegates to `__next_builtin__not-found.js` and outputs `GET /en 404`.

**Expected behavior:** `GET /en` returns HTTP 200 OK rendering the public home route component.
**Actual behavior:** `GET /en` returned HTTP 404 Not Found.

## 🧠 Root Cause Analysis

In `ssl-fe-user/src/app/[locale]/(main)/(public)/page.tsx`, the root locale page attempted to re-export the default export from `./home/page` using shorthand export syntax:

```tsx
export { default, generateMetadata } from './home/page';
export const revalidate = 300;
```

In Next.js 16 with Turbopack, static analysis for App Router route handlers requires an explicit default export component import/export statement. Because of the direct `export { default }` re-export syntax, Turbopack failed to register `page.tsx` as a valid page route for `/[locale]`, triggering Next.js fallback to `not-found`.

## 🔧 Fix Applied

Updated `ssl-fe-user/src/app/[locale]/(main)/(public)/page.tsx` to explicitly import `HomeRoute` and `generateMetadata` before exporting:

```tsx
import HomeRoute, { generateMetadata } from './home/page';

export { generateMetadata };
export default HomeRoute;

export const revalidate = 300;
```

## 🧪 Unit / Regression Test

- **Command:** `curl -I http://localhost:8001/en`
- **Result:** Returned `HTTP/1.1 200 OK` with full page HTML payload.
- **Linting:** Executed `npx eslint "src/app/[locale]/(main)/(public)/page.tsx"` with 0 errors.

## 🔗 References

- Related bug cases: BUG-006, BUG-030
