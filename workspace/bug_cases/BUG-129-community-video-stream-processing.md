# BUG-129: Community post video lightbox shows Bunny “Processing video”

> **Status:** ✅ Fixed  
> **Date Found:** 2026-08-29  
> **Date Fixed:** 2026-08-29  
> **Project:** SSL  
> **Severity:** 🟠 High

---

## Description

After uploading a video to a community post on develop, the post appeared in the feed for the author and other members, but opening the media lightbox showed Bunny’s **“Processing video”** overlay instead of a playable player.

Upload returned `status: APPROVED` with an `iframe.mediadelivery.net` embed URL. That APPROVED flag is moderation only — Bunny Stream encoding was still (or never treated as) unfinished, and the FE always mounted the embed iframe.

## Reproduction Steps

1. As a paid age-verified member, open a community feed.
2. Upload a short video and create a post (may be PENDING or ACTIVE).
3. Click the video tile (author or another member).

**Expected:** Lightbox plays the video (or shows SSL “Encoding video…” until Bunny is Finished, then plays).  
**Actual:** Lightbox shows Bunny’s “Processing video” text.

## Evidence

- Upload mutation success with embed URL + APPROVED.
- `createCommunityPost` success with `mediaIds` set.
- Empty `getPostComments` is unrelated (new post has 0 comments).
- String “Processing video” is not in SSL i18n — it comes from the Bunny embed player.

## Root Cause Analysis

1. `uploadToBunnyStream` returns the embed URL as soon as bytes are accepted; nothing polls Bunny `GET /videos/{id}` for status Finished (4).
2. Community lightbox always iframes `iframe.mediadelivery.net` URLs (BUG-122 fixed zero-height layout, but encoding readiness was still ignored).
3. Restrictive iframe `sandbox` could also leave the player stuck even after encode; sandbox was removed for community embeds.

## Fix Applied

**BE**

- `bunnyCtr.getVideo` + `parseBunnyEmbedVideoIds` / `isBunnyStreamVideoReady`
- `signModerationMediaForClient` sets non-persisted `streamReady` on `T_ModerationMedia`

**FE**

- `GetCommunityMedia` selects `streamReady`
- Lightbox shows `communities.feed.video_encoding` and polls refetch while `streamReady === false`
- Mount Bunny iframe only when `shouldMountCommunityVideoEmbed` (streamReady !== false)
- Drop iframe `sandbox` on community lightbox embeds

## Unit / Regression Test

- `ssl-be/src/modules/bunny/bunny.util.test.ts`
- `ssl-fe-user/src/modules/communities/communities.type.test.unit.ts` (Bunny streamReady gating)

## Lessons Learned

Moderation APPROVED ≠ stream playable. Gate the embed on Bunny encode status and show our own encoding UI until Finished.

## References

- Related: BUG-120, BUG-121, BUG-122
- Plan: Fix community lightbox “Processing video”
