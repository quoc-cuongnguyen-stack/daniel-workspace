# BUG-104: Most Active Members avatars missing from another account

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

The community feed Most Active Members list showed the default silhouette avatar for other members, while the same person's avatar rendered correctly on their feed post. Viewing the list from another account made the gap obvious: only a cache-merged self user (or a later WebSocket member payload) had `partner1.gallery.url`.

## Reproduction Steps

1. Open `/en/communities/<slug>/feed` as member A.
2. Confirm member B has a profile photo on a feed post.
3. Look at Most Active Members without reloading.
4. Repeat the feed as member B.

**Expected behavior:** Every viewer sees the same member avatars.
**Actual behavior:** Other accounts saw `/images/default.webp` placeholders.

## Evidence

```
getCommunityMembers $lookup copies users.partner1.galleryId.
Gallery is a UserPartner virtual (partner1.gallery), so aggregation docs have no gallery.url.
ActiveMemberItem falls back to DEFAULT_AVATAR_URL.
Feed posts populate author partner1.gallery, so the post avatar works.
```

Screenshots: feed post for Secretswingerlust showed a couple photo; Most Active Members showed the red silhouette for that same user when viewed from another account.

## Tracing Evidence

No backend error span. Missing field on a successful `getCommunityMembers` payload.

**Jaeger Trace IDs:**
- N/A (Jaeger not required; product query succeeded without gallery)

## PostHog Evidence

Local localhost:8001 reproduction. No PostHog session link.

## Root Cause Analysis

`getCommunityMembers` uses Mongo aggregation `$lookup` on the users collection. Mongoose virtuals (`partner1.gallery`, `partner2.gallery`) are not materialized by `$lookup`. `getCommunityMembership`, applications, and community posts populate those paths, so avatars appear there. Apollo can still show the logged-in user's avatar if a previous User query wrote gallery into the cache, which made the bug look account-specific.

**Related files:**
- [community-member.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-member.controller.ts)
- [community.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.util.ts)
- [active-member-item.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/active-member-item.tsx)
- [active-member-item.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/active-member-item.util.ts)

## Fix Applied

After the member page aggregation, load the same user ids with `partner1.gallery` / `partner2.gallery` populate and merge those galleries onto every member in the page. All viewers get the same `gallery.url` on the initial query.

## Unit / Regression Test

- **Test File:** [community.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.util.test.ts)
- **Test File:** [community-member.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-member.controller.test.ts)
- **Test File:** [active-member-item.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/active-member-item.test.unit.ts)
- **Test File:** [active-member-item.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/active-member-item.test.e2e.ts)
- **Test File:** [communities.activity-points.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.activity-points.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` and `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`
- **Test Results:** Merge attaches another member's gallery URL; `getCommunityMembers` returns that URL for a non-viewer user; FE helper uses the gallery URL instead of the default placeholder; live cache patch keeps the gallery.

## Lessons Learned

Aggregation `$lookup` is not a substitute for mongoose populate of virtuals. Leaderboard widgets that share a User fragment with posts still need the same gallery populate, or avatars silently fall back to the default image.

## References

- Related bug cases: BUG-096
- Knowledge item: [community-members-avatar-missing-other-account](file:///Users/daniel/.gemini/antigravity-ide/knowledge/community-members-avatar-missing-other-account/artifacts/bug_analysis.md)
