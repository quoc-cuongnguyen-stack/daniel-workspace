# BUG-119: Just-posted community comment media renders as null until reload

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-26
> **Date Fixed:** 2026-08-26
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

After posting a community comment with a photo, the tile showed an empty box with `null` instead of the image. Reloading the page showed the image correctly.

## Reproduction steps

1. Open a community feed post and expand comments.
2. Attach a photo. Submit with or without text.
3. Look at the new comment tile before reloading.

**Expected behavior:** The photo shows immediately.
**Actual behavior:** The tile is empty and displays `null`. After reload the image appears.

## Evidence

Local feed at `localhost:8001/en/communities/community-name-01/feed`. A "Just now" comment had a dark media tile with `null` in the center. The parent post image (Pending) rendered.

## Tracing evidence

Jaeger was not required. The first paint used `thumbnailUrl ?? url` and `url(${mediaUrl})`. A GraphQL/cache `null` or the string `"null"` is truthy enough to skip the placeholder and becomes CSS `url(null)`.

## PostHog evidence

No linked session.

## Root cause analysis

Comment tiles resolve media from GetCommunityMedia plus a local overlay of the upload result. The first query/cache row can have `url: null` or `"null"` before a signed URL exists. `communityMediaInfoFromUpload` also dropped the overlay when `upload.url` was missing, and then revoked the blob preview. Reload later hits GetCommunityMedia with a real http URL.

**Related files:**
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)

## Fix applied

`getCommunityMediaTileUrl` only accepts http/blob/data URLs and rejects `null` / `"null"`. The upload overlay keeps the local blob when the server url is unusable, and does not revoke that blob. `mergeCommunityMediaById` will not replace a preview with a null fetch row, and prefers a later signed http URL.

## Unit / Regression test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `test:e2e`
- **Test Results:** First-paint null url is skipped. Blob overlay wins until a signed http url arrives. 161 unit and 10 e2e passed.

## Lessons learned

A tile `src` must be a displayable URL, not a GraphQL null. Keep the local preview until the signed URL exists.

## References

- Related bug cases: BUG-110, BUG-118
