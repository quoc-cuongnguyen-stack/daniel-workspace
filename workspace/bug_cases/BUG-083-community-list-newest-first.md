# BUG-083: Newest community did not appear at the top

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

The communities index heading is "Newest Communities", but a newly created community landed at the bottom (or on a later page). My Communities in the sidebar had the same oldest-first order.

## Reproduction steps

1. Create a community.
2. Open `/communities` and the My Communities sidebar.

**Expected behavior:** The new community is first.
**Actual behavior:** Mongo returned insertion order (oldest first) because neither `getCommunities` nor `getMyCommunities` set `sort`.

## Evidence

Index `useGetCommunities` passed page/limit/populate only. Dashboard newest section already used `{ createdAt: -1 }`. `getMyCommunities` loaded memberships, then `findPaging({ id: { $in: communityIds } })` without a community `createdAt` sort.

## Tracing evidence

Jaeger was not required.

## PostHog evidence

None.

## Root cause analysis

List reads used the mongoose default order. `$in` also does not preserve newest-first membership order.

**Related files:**
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.util.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

Default missing list sort to `{ createdAt: -1 }` in `getCommunities` and the community query inside `getMyCommunities`. Frontend list hooks send the same default so callers do not have to remember it.

## Unit / regression test

- [community.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.util.test.ts)
- [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts)
- [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)

## Lessons learned

A "newest" heading is not a sort. Default the query when the product contract is newest-first.

## References

- Dashboard newest section already sorted correctly
