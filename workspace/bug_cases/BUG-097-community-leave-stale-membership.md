# BUG-097: Leave community leaves stale membership UI

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

After leaving a community, the UI still treated the user as a member. A second leave attempt returned "Not a member of this community."

## 🔄 Reproduction Steps

1. Open a community feed as a member.
2. Leave the community.
3. Observe Leave / member UI still present, or reopen the community without a hard reload.
4. Attempt leave again.

**Expected behavior:** Membership UI clears immediately after a successful leave.
**Actual behavior:** UI still showed member state; second leave failed with "Not a member of this community."

## 📸 Evidence

Pre-fix debug logs kept `hasMembership:true` with membership id `60449268-fa11-4bfd-924a-d4f36460ffe9` after the server had already soft-deleted membership.

Post-fix logs for the same community showed stable `hasMembership:false` / `membershipId:null`.

## 🔭 Tracing Evidence

Pure frontend Apollo cache bug. No backend span failure.

## 📊 PostHog Evidence

N/A

## 🧠 Root Cause Analysis

`joinCommunity` wrote a cache-first `getCommunityMembership` entry. `leaveCommunity` only evicted `getMyCommunities`, so the membership query kept the old member row. The Leave button was also gated on `isMember`, which stays true for community creators even after the membership row is gone.

**Related files:**
- [communities.cache.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)

## 🔧 Fix Applied

1. On successful leave, write `getCommunityMembership.result = null`, evict my-communities, and refresh member lists.
2. Gate the Leave button on `ownMember` so creators without an active membership row no longer see Leave.

## 🧪 Unit / Regression Test

- **Test File:** [communities.cache.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.unit.ts)
- **E2E File:** [communities.cache.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.cache.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` / `test:e2e`
- **Test Results:** Leave success clears membership and member lists; failed leave leaves cache untouched.

## 📝 Lessons Learned

Membership-changing mutations must update `getCommunityMembership`, not only list queries. Creator identity is not the same as an active membership row for Leave actions.

## 🔗 References

- Related: BUG-096
- Knowledge item: `community-leave-stale-membership`
