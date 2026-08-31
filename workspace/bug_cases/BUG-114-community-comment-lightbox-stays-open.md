# BUG-114: Deleting a comment with a photo leaves the media lightbox open

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

After deleting a community comment that had an attached photo, the media lightbox stayed open on that image. The comment list showed "No comments yet" and `?mediaId` stayed in the URL.

## Reproduction Steps

1. Open a community feed post that already has a photo.
2. Add a comment with a photo, click the comment photo to open the lightbox (gallery shows 2 / 2).
3. Delete that comment from the lightbox sidebar.

**Expected behavior:** The lightbox closes (or at least drops the deleted comment slide) because the source comment is gone.
**Actual behavior:** The modal stays open on the deleted comment image. Comment count is 0.

## Evidence

Feed URL still had `?mediaId=...`. Sidebar: 0 comments, "No comments yet". Counter still `2 / 2`.

## Tracing Evidence

Frontend lightbox state. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No exception. The comment delete succeeded; the gallery extras were never removed.

## Root Cause Analysis

BUG-111 appends comment attachments onto `extraLightboxItems` so they can open in the same lightbox as post media. Delete only removed the comment row. The extra slide and the `mediaId` query param were left in place, so the modal kept showing an image whose comment no longer existed.

**Related files:**
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix Applied

`getCommunityLightboxAfterCommentDelete` drops the deleted comment's media ids. If the open slide is gone, close the modal and clear `?mediaId`. The feed also strips those ids from `extraLightboxItems`.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Viewing the comment slide after delete sets `shouldClose`. Viewing a post slide keeps the modal open with extras removed.

## Lessons Learned

Ephemeral gallery extras must be torn down with the entity that created them. A URL `mediaId` is enough to keep a modal open after the source row is gone.

## References

- Related bug cases: BUG-111, BUG-112
