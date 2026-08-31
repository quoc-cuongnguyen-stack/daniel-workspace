# BUG-120: Community post videos appear but cannot be played

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

Uploaded videos showed on community posts (thumbnail + badge), but clicking them did not play the video. The lightbox opened a still image with no player.

## Reproduction Steps

1. Open a community feed as a member.
2. Create a post with a video, or find an existing post with a video thumbnail.
3. Click the video tile.

**Expected behavior:** The media lightbox opens a playable video (Bunny embed iframe or native controls).
**Actual behavior:** The still thumbnail is shown. There is no play control, and clicks on the media do nothing.

## Evidence

`useCommunityMediaById` stored `getCommunityMediaTileUrl(item)` as `url`. That helper prefers `thumbnailUrl`, so a video's playable embed/file URL was replaced with a JPEG poster.

The lightbox then did `type === 'VIDEO'` and iframed `active.url || active.thumbnailUrl`, which was the poster.

## Tracing Evidence

Frontend lookup/render bug. Jaeger was not running locally.

**Jaeger Trace IDs:**
- N/A

## PostHog Evidence

No matching exception: the click handler succeeded and rendered a non-playable iframe.

## Root Cause Analysis

Tile preview and playback URL were collapsed into one field. After videos gained thumbnails (so they "appeared"), that field became the poster. The lightbox treated VIDEO type as an iframe source and loaded the JPEG.

**Related files:**
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)

## Fix Applied

`communityMediaLookupFromItem` keeps the original playable `url` and leaves the thumbnail for tiles. The lightbox uses `getCommunityVideoSrc` (rejects poster JPEGs) and renders an embed iframe or a native `<video controls>` for file/blob URLs. Tile overlays use `pointer-events-none` so the button receives the click.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Lookup keeps the embed/file url when a thumbnail exists. A JPEG stuffed into `url` is not a playback src. Lightbox open uses the playable url. 148 unit and 8 e2e passed.

## Lessons Learned

A display helper that prefers thumbnails must not write back into the playback URL field. Video lightbox sources need an explicit "this is an embed / file, not a poster" check.

## References

- Related bug cases: BUG-111
