# BUG-092: Community controller imports a missing SUPPORTED_LOCALES export

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-18
> **Date Fixed:** 2026-08-18
> **Project:** SSL (ssl-be)
> **Severity:** 🔴 Critical

---

## Description

ssl-be crashed on startup while loading the GraphQL schema. `community.controller.js` imported `SUPPORTED_LOCALES` from `shared/util/localize.js`, but the compiled localize module did not provide that named export.

## Reproduction steps

1. Deploy `feature/communities-be` and start ssl-be with `node ./build/server.js`.
2. Watch PM2 / process logs during schema load.

**Expected behavior:** The process starts and serves GraphQL.
**Actual behavior:** Node throws `SyntaxError: The requested module '../../shared/util/localize.js' does not provide an export named 'SUPPORTED_LOCALES'`.

## Evidence

```
file:///home/ubuntu/ssl-be/build/modules/community/community.controller.js:8
import { SUPPORTED_LOCALES } from '../../shared/util/localize.js';
SyntaxError: The requested module '../../shared/util/localize.js' does not provide an export named 'SUPPORTED_LOCALES'
    at async file:///home/ubuntu/ssl-be/build/shared/graphql/schema.js:26:21
```

## Tracing evidence

Jaeger was unavailable. This fails during ESM module instantiation, before any request span exists.

## PostHog evidence

Not used. This is a process boot failure, not a browser session.

## Root cause analysis

`community.model.ts` and `community.service.ts` (and older `community.controller.js` builds) import `SUPPORTED_LOCALES` from `#shared/util/localize.js`. On `develop`, that name was a private `const` inside `localize.ts`. After `tsc-alias`, the import becomes `../../shared/util/localize.js`. A mixed or stale `build/shared/util/localize.js` therefore has no named export, and Node rejects the import before the server listens.

**Related files:**
- [localize.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/shared/util/localize.ts)
- [supported-locales.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/shared/util/supported-locales.ts)
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community.model.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.model.ts)
- [community.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.ts)

## Fix applied

Moved the locale list into `supported-locales.ts` and re-exported `SUPPORTED_LOCALES` from `localize.ts` as a live named binding so compiled `localize.js` always has `export { SUPPORTED_LOCALES }`.

The first pass only landed on local `feature/communities-be`. `develop` still kept `SUPPORTED_LOCALES` as a private `const`, so a develop deploy (or a mixed `build/` with leftover community artifacts) crashed again with the same ESM error.

The export now lives on `develop` as well. After deploy, rebuild from a clean `build/` directory so stale `community.controller.js` / `localize.js` cannot stay paired.

## Unit / Regression Test

- **Test File:** [localize.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/shared/util/localize.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/shared/util/localize.test.ts`
- **Test Results:** Dynamic import asserts the named `SUPPORTED_LOCALES` binding exists; the set is iterable and matches `SUPPORTED_LOCALE_CODES`; locale-keyed objects still localize.

## Lessons learned

A private helper constant cannot be treated as a public ESM export. Incremental deploys that rebuild `localize.js` from `develop` while leaving community artifacts in `build/` will crash at import time.

## References

- Related bug cases: BUG-091
- Jaeger traces: unavailable
