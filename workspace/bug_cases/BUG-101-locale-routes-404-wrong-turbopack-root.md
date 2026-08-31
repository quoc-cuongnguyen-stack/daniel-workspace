# BUG-101: GET /[locale] returns Next.js builtin 404 after fresh Turbopack start

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-31
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🔴 Critical

---

## Description

Two local symptoms, same cause. After `next dev --port 8001 --turbopack`, `http://localhost:8001/en` either (1) hung forever on `○ Compiling /[locale] ...` (`curl` 0 bytes / timeout) when Turbopack rooted at the SSL monorepo `pnpm-lock.yaml`, or (2) returned the builtin Next 404 after a clean `.next` when it rooted at `/Users/daniel/package-lock.json`. Static paths such as `/open` and `/robots.txt` still returned 200.

This is separate from BUG-040. The locale home `page.tsx` already uses an explicit `export default HomeRoute`.

## Reproduction steps

1. Leave a `package-lock.json` in `/Users/daniel` (or any ancestor of the repo).
2. From `ssl-fe-user`, run `rm -rf .next` then `pnpm dev` (`next dev --turbopack` on port 8001).
3. Request `GET /en`.

**Expected behavior:** `GET /en` returns HTTP 200 and renders the public home route.
**Actual behavior:** Next compiles `/_not-found/page` instead of `/[locale]`. Live `.next/dev/types/routes.d.ts` has `type AppRoutes = never`. `.next/dev/server/app-paths-manifest.json` only lists `/_not-found/page`.

## Evidence

Startup warning from Warp (`pnpm dev`, 2026-08-20):

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
 We detected multiple lockfiles and selected the directory of /Users/daniel/package-lock.json as the root directory.
 To silence this warning, set `turbopack.root` in your Next.js config
 Detected additional lockfiles:
   * /Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/pnpm-workspace.yaml
```

Live manifest after the 12:06 restart:

```json
{
  "/_not-found/page": "app/_not-found/page.js"
}
```

`curl -sI http://127.0.0.1:8001/en` -> `HTTP/1.1 404 Not Found` with title `404: This page could not be found.`

An earlier same-day session (warm `.next` cache) still compiled `/[locale]` and returned `GET /en 200`. After `rm -rf .next` the empty cache plus the wrong root dropped the entire App Router tree.

2026-08-31 (`pnpm start:dev`, Next 16.2.1): compile stuck on `○ Compiling /[locale] ...`. Warning selected `/Users/daniel/Projects/CyberSkill/SSL/pnpm-lock.yaml` as root. `curl --max-time 15 http://localhost:8001/en` → `http:000` / 0 bytes. `GET /` still 308.

## Tracing evidence

Jaeger is not involved. This is a local Next.js route-discovery failure before any page code runs.

**Jaeger Trace IDs:**
- none

## PostHog evidence

Local-only. Production `https://secretswingerlust.com/en` is not this failure. No PostHog session or error-tracking issue was queried for this 404.

## Root cause analysis

Next.js 16.2.1 Turbopack walks up from the project looking for lockfiles to infer `turbopack.root`. It selected `/Users/daniel` because `/Users/daniel/package-lock.json` exists (85 bytes, 2026-08-11). After the cache wipe, Turbopack scanned that home directory instead of `ssl-fe-user/src/app`, so `[locale]` pages were never registered and every locale URL hit the builtin 404.

**Related files:**
- [next.config.mjs](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/next.config.mjs)
- [src/app/[locale]/(main)/(public)/page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(main)/(public)/page.tsx)
- [src/proxy.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/proxy.ts)

## Fix applied

Do **not** pin `turbopack.root` in `next.config`. The parent `SSL/package.json` + `SSL/pnpm-lock.yaml` were a leftover Cursor SDK playground (`@cursor/sdk`). Next treated `SSL/` as the resolve root (`using description file: SSL/package.json`), so `tailwindcss` / `next` were looked up in `SSL/node_modules`.

Durable fix: move the playground to `daniel_workspace/cursor-sdk/` and delete `SSL/node_modules` + `SSL/pnpm-lock.yaml`. Next then only sees `ssl-fe-user/pnpm-lock.yaml`. Do not run `pnpm i` at `SSL/`.

## Unit / regression test

No app-code change. Repro is local Next root inference; restart `pnpm dev` from `ssl-fe-user` after the move.

## Lessons learned

- A stray ancestor lockfile can make Turbopack drop the entire App Router tree after a cache reset.
- `AppRoutes = never` plus compile-`/_not-found` is the local fingerprint, not a missing `page.tsx`.
- Do not treat this as a repeat of BUG-040 without checking `turbopack.root`.

## References

- Related bug cases: BUG-040
- Next.js turbopack.root: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
