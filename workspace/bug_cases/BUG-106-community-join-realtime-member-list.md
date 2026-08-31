# BUG-106: Member list not live for other viewers on join

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

When a user joined a community, Most Active Members (and member stats) only refreshed for the joiner via Apollo cache eviction. Other members already on the feed did not see the new person until they reloaded.

## Reproduction Steps

1. Open a community feed as member A.
2. Join the same community as member B in another session.
3. Watch Most Active Members on A's feed without reloading.

**Expected behavior:** A's list updates when B joins.
**Actual behavior:** A's list stayed stale until reload.

## Evidence

Join and application-approve only updated the mutating client's cache (BUG-096). The existing `communityActivityPointsUpdated` WebSocket was points-only.

## Tracing Evidence

N/A. Successful join mutation; no error span.

## PostHog Evidence

Local reproduction. No PostHog session link.

## Root Cause Analysis

No pubsub event on membership create. Other viewers subscribed to activity points but never received a join payload.

**Related files:**
- [community-points.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-points.service.ts)
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community-application.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.ts)
- [communities.activity-points.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.activity-points.ts)

## Fix Applied

Join and approved applications publish on the existing per-community WebSocket with `memberJoined: true`. Other viewers evict `getCommunityMembers` / `getCommunityMemberStats` and refetch, instead of only patching points in Top 10.

## Unit / Regression Test

- **Test File:** [community-points.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-points.service.test.ts)
- **Test File:** [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts)
- **Test File:** [communities.activity-points.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.activity-points.test.unit.ts)
- **Test File:** [communities.activity-points.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.activity-points.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` and `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`
- **Test Results:** Join and approve publish `memberJoined`; the client evicts member caches instead of a points-only patch.

## Lessons Learned

A cache update on the mutating client does not reach other open feeds. Membership changes need the same community-scoped WebSocket as live points.

## References

- Related bug cases: BUG-096
- Knowledge item: [community-join-realtime-member-list](file:///Users/daniel/.gemini/antigravity-ide/knowledge/community-join-realtime-member-list/artifacts/bug_analysis.md)
