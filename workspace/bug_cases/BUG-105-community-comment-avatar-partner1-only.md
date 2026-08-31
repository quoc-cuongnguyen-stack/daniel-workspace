# BUG-105: Community post comment avatars showed only partner1

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

On a community feed post, the comment composer showed only `partner1.gallery` for a couple account. The post header already split both partner photos.

## Reproduction Steps

1. Open `/en/communities/<slug>/feed` as a couple account.
2. Expand comments on a post.
3. Look at the avatar next to the comment input.

**Expected behavior:** Couple accounts show both partner photos, matching the post author avatar.
**Actual behavior:** The comment input showed only partner1.

## Evidence

`community-post.tsx` comment composer used:

```
auth?.user?.partner1?.gallery?.url ?? DEFAULT_AVATAR_URL
```

No `accountType === COUPLE` split and no `partner2.gallery`.

## Tracing Evidence

No backend error span. CheckAuth already returns `partner1` and `partner2` galleries. Comment queries already populate `author` with `communityAuthorAvatarPopulate`.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

Local localhost:8001 reproduction. No PostHog session link.

## Root Cause Analysis

The comment list already had couple-split markup. The composer next to it used a single `img` bound to `partner1` only, so a couple account looked like a single profile while typing a comment.

**Related files:**
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-user-avatar.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.tsx)
- [community-user-avatar.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.util.ts)

## Fix Applied

Shared `CommunityUserAvatar` / `communityUserAvatarSlots` so couple accounts always get two image slots. The post author, comment list, and comment composer all use that helper.

## Unit / Regression Test

- **Test File:** [community-user-avatar.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.test.unit.ts)
- **Test File:** [community-user-avatar.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-user-avatar.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`
- **Test Results:** Couple composer and comment author return both gallery URLs; a single account stays on partner1; missing gallery falls back to the default image.

## Lessons Learned

A couple-split avatar on the post header does not automatically apply to the comment composer. Any community avatar that reads `auth.user` still needs the same two-slot layout.

## References

- Related bug cases: BUG-104
- Knowledge item: [community-comment-avatar-partner1-only](file:///Users/daniel/.gemini/antigravity-ide/knowledge/community-comment-avatar-partner1-only/artifacts/bug_analysis.md)
