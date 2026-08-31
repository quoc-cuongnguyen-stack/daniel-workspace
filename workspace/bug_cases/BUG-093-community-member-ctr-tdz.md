# BUG-093: communityMemberCtr accessed before initialization

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-18
> **Date Fixed:** 2026-08-18
> **Project:** SSL (ssl-be)
> **Severity:** 🔴 Critical

---

## Description

ssl-be crashed on startup while evaluating `community.controller.ts`. `communityCtr` copied `communityMemberCtr.getCommunityMembers` at module init time, but a circular import left `communityMemberCtr` in the temporal dead zone.

## Reproduction steps

1. Start ssl-be from `feature/communities-be` (`pnpm start:dev` or `node ./build/server.js`).
2. Watch the process load GraphQL resolvers.

**Expected behavior:** The process starts and serves GraphQL.
**Actual behavior:** Node throws `ReferenceError: Cannot access 'communityMemberCtr' before initialization` at `community.controller.ts:100`.

## Evidence

```
/Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts:100
    getCommunityMembers: communityMemberCtr.getCommunityMembers,
                         ^

ReferenceError: Cannot access 'communityMemberCtr' before initialization
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
```

## Tracing evidence

Jaeger was unavailable. This fails during ESM module evaluation, before any request span exists.

## PostHog evidence

Not used. This is a process boot failure, not a browser session.

## Root cause analysis

`community.resolver.ts` imports `community-member.controller.ts` and then `community.controller.ts`. The member controller imports `community.service.ts`, and the service imported `communityCtr` from `community.controller.ts`.

That cycle evaluates `community.controller.ts` while `community-member.controller.ts` is still loading. The object literal

```
getCommunityMembers: communityMemberCtr.getCommunityMembers
```

reads the live binding immediately, so Node throws a TDZ ReferenceError.

**Related files:**
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.ts)
- [community-member.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-member.controller.ts)
- [community.resolver.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.resolver.ts)

## Fix applied

1. `requireCommunityMemberViewAccess` now reads `CommunityModel` / `CommunityMemberModel` directly, so `community.service.ts` no longer imports either controller.
2. `communityCtr` forwards member methods through call-time wrappers instead of copying function references during module init.

## Unit / Regression Test

- **Test File:** [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts), [community.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/community/community.controller.test.ts src/modules/community/community.service.test.ts`
- **Test Results:** Importing `community.service` before `community.controller` no longer throws; owner and member access checks pass; visitors are rejected.

## Lessons learned

Do not read another module's live binding while building an exported object. A service that needs a community or membership row should query the model, not import the controller that imported the service.

## References

- Related bug cases: BUG-092
- Jaeger traces: unavailable
