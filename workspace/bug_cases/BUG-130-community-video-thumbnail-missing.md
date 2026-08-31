# BUG-130: Community video tiles missing thumbnail after streamReady fix

> **Status:** ✅ Fixed  
> **Date Found:** 2026-08-29  
> **Date Fixed:** 2026-08-29  
> **Project:** SSL  
> **Severity:** 🟡 Medium

---

## Description

After BUG-129 fixed Bunny “Processing video” in the lightbox, community **video feed/gallery tiles** showed only a dark background + play mark — no poster image. Playback still worked when opened.

## Reproduction Steps

1. Open a community feed with an uploaded video post.
2. Observe the video tile on the feed/gallery.

**Expected:** Tile shows a Bunny stream poster (or local blob preview right after upload).  
**Actual:** Empty dark tile with play icon only.

## Root Cause Analysis

1. FE `getCommunityMediaTileUrl` correctly refuses embed/VIDEO playback URLs as CSS backgrounds (BUG-121) — tiles **require** `thumbnailUrl`.
2. BE `signModerationMediaForClient` CDN-signed stored `thumbnailUrl`; `generateSignedUrl` can return `''` without throwing, then **early-returned** and skipped `attachStreamThumbnailIfMissing`.
3. Stream-poster generation should use the **raw** embed URL; FE `communityMediaInfoFromUpload` never set `thumbnailUrl` / blob preview for optimistic tiles.

## Fix Applied

- BE: clear empty signed thumbs and fall through to `attachStreamThumbnailIfMissing(..., rawUrlBeforeSign)`.
- Util: treat blank `thumbnailUrl` as missing; accept optional `embedUrlForPoster`.
- FE: map upload `thumbnailUrl` and blob `localPreview` onto `thumbnailUrl` so tiles paint immediately.

## Unit / Regression Test

- `ssl-be/.../moderation-media.util.test.ts`
- `ssl-fe-user/.../communities.type.test.unit.ts` (blob/remote thumb mapping)

## Live verification (2026-08-30)

`getModerationMedias` on develop returned correct shape (`VIDEO`, non-empty `…/thumbnail.jpg`, `streamReady: true`) but thumbs used host `vz-24efcf16-26d.b-cdn.net` → Bunny **Domain suspended or not configured** (HTTP 403 HTML). Embed `iframe.mediadelivery.net` for library `476937` still HTTP 200.

Bunny Stream API page for library `476937` shows CDN hostname / pull zone **`vz-52a84f34-1d2`**. Local/develop `BUNNY_STREAM_HOST_NAME` still pointed at the old `vz-24efcf16-26d` host — `generateStreamThumbnailUrlFromUrl` builds posters from that env, so tiles stayed dark despite a valid GraphQL field.

**Ops fix:** set `BUNNY_STREAM_HOST_NAME=https://vz-52a84f34-1d2.b-cdn.net`, restart BE, re-fetch media (new signed thumbs). Unsigned probe of new host returns token **403 Forbidden** (zone configured), not “Domain suspended”.

## References

- Related: BUG-121, BUG-129
