# BUG-111: Community comment media does not open in the feed lightbox

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

After BUG-110, community post comments showed attached images, but clicking a comment image did nothing. Post attachments still opened the fullscreen lightbox.

## Reproduction Steps

1. Open a community feed post and expand comments.
2. Submit a comment with a photo (or find an existing comment with media).
3. Click the comment image.

**Expected behavior:** The same community media lightbox opens on that image.
**Actual behavior:** The click is ignored. The image stays in the comment tile.

## Evidence

Feed `onMediaOpen` only opened when `lightboxItems.findIndex(...) !== -1`. `buildLightboxItems` walks `post.mediaIds` only. Comment `mediaIds` are fetched inside `CommunityPost` and never enter that list.

## Tracing Evidence

Frontend click-handler bug. Jaeger was not running locally.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception: the handler returned without throwing.

## Root Cause Analysis

Comment tiles called `onMediaOpen(mediaId)`. The parent looked that id up in a list built from post attachments. Comment ids were always missing, so index was `-1` and the lightbox never opened.

**Related files:**
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix Applied

`CommunityPost` passes the resolved media row with the click. The feed appends that row onto the existing lightbox list (deduped by mediaId) and opens at the matching index. Post tiles still open from the original list.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Post-only `findIndex` stays `-1` for comment media; `resolveCommunityLightboxOpen` with the extra row opens at index 1. Rejected comment media is not appended.

## Lessons Learned

A tile can look clickable (`disabled` is false once a URL exists) while the parent still no-ops if its lookup list is a narrower set than what the child rendered.

## References

- Related bug cases: BUG-110
- Superthread: [C-994](https://app.superthread.com/cnlgaming/card-994-bug-uploaded-image-does-not-display-in-comment-after-submission)
