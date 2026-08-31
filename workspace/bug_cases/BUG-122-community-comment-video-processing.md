# BUG-122: Comment video lightbox shows Processing video

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

Clicking a video on a community comment opened the media lightbox with Bunny's "Processing video" overlay instead of a playable player.

URL example: `/en/communities/community-name-01/feed?mediaId=cef823fb-7fc3-4900-ac91-7ddedbf73ce5`

## Reproduction Steps

1. Open a community feed as a member.
2. Expand comments on a post that has a video attachment on a comment.
3. Click the comment video tile.

**Expected behavior:** The lightbox plays the video (Bunny embed or native controls).
**Actual behavior:** The modal shows the text "Processing video".

## Evidence

The string is not in SSL i18n. It comes from the Bunny Stream embed player. That overlay appears when encoding is unfinished, and also when the iframe has no real width/height (percentage `h-[90%]` on a flex parent whose height is content-sized).

## Tracing Evidence

Frontend embed layout. Jaeger was not required.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

Local localhost report. No production exception.

## Root Cause Analysis

After BUG-120 the lightbox correctly iframes `iframe.mediadelivery.net/embed/...`. The iframe used `w-[90%] h-[90%]` as a flex child with no aspect-ratio box, so computed height often collapsed. Bunny's player then stays on "Processing video". Comment videos hit this path because they are extra lightbox rows, not post `mediaIds`.

`communityMediaInfoFromUpload` also dropped video playback URLs by routing them through `getCommunityMediaTileUrl`, so a just-posted comment video could lose its playable src.

**Related files:**
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix Applied

Wrap the embed in a 16:9 box with an absolutely positioned iframe (`preload=true`). Keep comment upload lookup on the blob/embed playback URL with type VIDEO. Treat embed/file URLs as video src even if `type` is missing.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Embed URL plays without type. Embed src includes preload=true. Comment upload maps blob + VIDEO. Lightbox extra row opens the embed.

## Lessons Learned

Bunny's processing overlay is not always encoding. An embed iframe needs a real box (aspect-ratio + absolute fill), the same pattern Bunny documents.

## References

- Related bug cases: BUG-120, BUG-121
- Bunny embed sizing: https://docs.bunny.net/stream/embedding
