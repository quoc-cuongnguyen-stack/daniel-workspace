# BUG-063: Podcast card shows stale deleted featuredImage after cover/logo re-upload

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-14
> **Date Fixed:** 2026-08-14
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

Saving a new Cover or Logo for a Podcast/Blog returns `updateBlog.success: true`, but the admin card view still fails to display the new image. For `A Journey into the Swinger World`, the card keeps requesting an old `featuredImage` that returns HTTP 404 while the newly persisted `cover` and `logo` return HTTP 200.

## Reproduction Steps

1. Open admin `https://x4-core.secretswingerlust.com/blog?type=PODCAST`.
2. Edit `A Journey into the Swinger World` (`b9ac95ef-3b48-4123-afc1-868242a815c4`).
3. Re-upload Cover and/or Logo, then save.
4. Observe the list card thumbnail.

**Expected behavior:** Card thumbnail shows the newly uploaded cover image.
**Actual behavior:** Card keeps the previous `featuredImage` URL. That CDN object is often already deleted and returns 404.

## Evidence

Successful `updateBlog` payload for the affected record:

- `featuredImage`: `.../podcastfoto2-1766832576448.jpg` (HTTP 404)
- `cover`: `.../podcastfoto2-1786644903270.jpg` (HTTP 200)
- `logo`: `.../avatar-1786561609815.jpg` (HTTP 200)

Admin card DOM uses only `featuredImage`.

## Tracing Evidence

Not applicable. Persistence and CDN HEAD checks already identified the broken URL.

## PostHog Evidence

Not used for this investigation. Reproduction was direct on the admin site.

## Root Cause Analysis

1. Admin `BlogCard` renders only `blog.featuredImage`.
2. Podcast form copied `cover` into `featuredImage` only when `featuredImage` was empty, so an existing podcast kept the old thumbnail after a cover re-upload.
3. Backend `prepareChangedMedia` deleted every replaced field's old storage key without checking whether another media field (`featuredImage`, `cover`, `logo`, `file`) still referenced that key. Shared cover/featuredImage objects were deleted while the card still pointed at them.

Cache invalidation was already present (`queryCacheService.bumpVersion('blog')`, route revalidation, Apollo list merge). Reloading could not repair the card because the server result itself still contained the stale `featuredImage`.

**Related files:**
- [blog-form.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog-form.tsx)
- [blog-form.payload.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog-form.payload.ts)
- [blog.card.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog.card.tsx)
- [blog-write.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.ts)

## Fix Applied

- Always sync podcast `featuredImage` to the current `cover` on create/update (`syncPodcastThumbnailFields`).
- Also sync local form state when a podcast cover is uploaded.
- Delete replaced Bunny objects only when no post-update media field still references that storage key.

## Unit / Regression Test

- **Test File:** [blog-form.payload.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog-form.payload.test.unit.ts), [blog-write.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.test.ts)
- **Command:** `pnpm --prefix ssl-fe-admin test:unit -- run src/modules/blog/blog-form.payload.test.unit.ts` and `pnpm --prefix ssl-be exec vitest run src/modules/blog/blog-write.service.test.ts`
- **Test Results:** Admin payload tests passed (28 tests across unit suite run). Backend write-service tests passed (11/11), including shared cover/logo retention and synchronized replacement deletion.

## Lessons Learned

Podcast card thumbnails are `featuredImage`, not `cover`. Media cleanup must treat cross-field shared storage keys as retained references.

## References

- Related prior incident: [CARD-940](file:///Users/daniel/Projects/CyberSkill/SSL/daniel_workspace/bug_cases/CARD-940-broken-podcast-media.md)
