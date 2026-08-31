# BUG-121: Community video tiles show a broken thumbnail icon

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

After BUG-120, community videos played correctly in the lightbox. After a page reload the tile still showed a broken-image icon (or a clapper emoji on an empty tile) instead of a poster.

## Reproduction Steps

1. Open a community feed as a member.
2. Post a video, or find an existing video post.
3. Reload the page.

**Expected behavior:** The tile shows the video poster (Bunny `thumbnail.jpg`) with a play mark.
**Actual behavior:** The browser shows a broken-image icon. Clicking still plays the video.

## Evidence

`getCommunityMediaTileUrl` kept playback `url` as the Bunny embed (`iframe.mediadelivery.net/.../embed/...`). Gallery, moderator, and leftover `thumbnailUrl ?? url` callers used that as `<img src>` / CSS `background-image`. An embed HTML page is not an image.

`GetCommunityMedia` signed the embed `url` but never generated a stream poster the way profile gallery does with `generateStreamThumbnailUrlFromUrl`.

## Tracing Evidence

Frontend tile src plus missing backend poster. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception: the image request 404/non-image is a browser broken-icon, not a JS throw.

## Root Cause Analysis

BUG-120 split playback `url` from the tile. Tiles still fell back to `url` when `thumbnailUrl` was empty. Community media signing never attached a Bunny stream poster, so after reload the only URL was the embed page.

**Related files:**
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-media-status.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-status.tsx)
- [moderation-media.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.ts)
- [moderation-media.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.controller.ts)

## Fix Applied

`getCommunityMediaTileUrl` never returns a video playback URL. Backend `attachStreamThumbnailIfMissing` fills `thumbnailUrl` from the embed via `generateStreamThumbnailUrlFromUrl`. Tiles use a dark fallback plus `CommunityVideoPlayMark` instead of a clapper emoji on a broken `<img>`.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts), [moderation-media.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.test.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`; `pnpm --prefix ssl-be test:unit`
- **Test Results:** Embed-only videos have an empty tile URL. Thumbnail + embed tiles the JPEG and still opens the embed. Backend attaches a poster only for `/embed/` URLs with no thumbnail.

## Lessons Learned

A playback URL must never be reused as an `<img>` src. Stream embeds need an explicit poster, the same way profile gallery already did.

## References

- Related bug cases: BUG-120
