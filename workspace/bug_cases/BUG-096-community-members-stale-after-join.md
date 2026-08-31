# BUG-096: Most Active Members stays stale after community join

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## 🔍 Description

The community feed "Most Active Members" list (backed by `getCommunityMembers`) did not refresh after a local join or after a moderator approved a private-community join request. The new member only appeared after a full page reload.

## 🔄 Reproduction Steps

1. Open a public community feed as a non-member with the Most Active Members sidebar visible in another tab/session, or join from the same browser while the feed is mounted.
2. Join the community (or approve a pending application as a moderator).
3. Observe the Most Active Members list before reloading.

**Expected behavior:** The member list refreshes immediately after membership changes.
**Actual behavior:** The list kept the pre-join Apollo cache until a hard reload.

## 📸 Evidence

```
useGetCommunityMembers used default cache-first Apollo policy.
useJoinCommunity only wrote getCommunityMembership and evicted getMyCommunities.
useReviewCommunityApplication had no cache update at all.
Moderator approve path called refetchApplications() but not refetchMembers().
```

## 🔭 Tracing Evidence

> Pure frontend Apollo cache bug. No backend span failure.

**Jaeger Trace IDs:**
- N/A

**Key Observations:**
- Backend `joinCommunity` / `reviewApplication` already create the member row correctly.
- Stale UI was caused by client cache retention of `getCommunityMembers`.

## 📊 PostHog Evidence

> Not required for this local cache-invalidation defect.

## 🧠 Root Cause Analysis

`getCommunityMembers` observers kept cached docs after membership-changing mutations. Join updated membership and "my communities", but never invalidated the members list. Application approval created a member on the server without any Apollo cache eviction, so Most Active Members stayed stale until remount/reload.

**Related files:**
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [communities.cache.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.ts)
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)

## 🔧 Fix Applied

Added shared Apollo cache helpers that evict `getCommunityMembers` and `getCommunityMemberStats` after a successful join and after an approved application review. Pending applications and rejections do not touch the member list.

```diff
+ cache.evict({ fieldName: 'getCommunityMembers' });
+ cache.evict({ fieldName: 'getCommunityMemberStats' });
+ cache.gc();
```

## 🧪 Unit / Regression Test

- **Test File:** [communities.cache.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.unit.ts)
- **E2E File:** [communities.cache.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` and `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Join and approved-review paths invalidate member caches; rejected reviews leave the Most Active Members cache intact.

## 📝 Lessons Learned

- When a mutation creates or removes membership, invalidate every query that lists members/stats, not only the caller's own membership query.
- Pending join requests are not members; only join and approval should refresh the leaderboard.

## 🔗 References

- Related bug cases: BUG-070, BUG-071
- Knowledge items: `community-members-stale-after-join`
