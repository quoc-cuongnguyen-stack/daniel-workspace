# CARD-940: Broken podcast images, logos, and audio files

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-13
> **Date Fixed:** 2026-08-13
> **Project:** SSL
> **Severity:** 🔴 Critical

---

## Description

After admins updated podcast text, images, logos, covers, and audio files broke across almost all podcast pages. Re-uploading audio failed because of the 100 MB upload limit.

## Reproduction Steps

1. Open an existing podcast in the admin editor.
2. Change only the text content and save.
3. Open the public podcast page.

**Expected behavior:** Existing images, logos, covers, and audio keep working.
**Actual behavior:** Media URLs point at Bunny objects that were deleted during the text-only save.

## Evidence

Superthread card `#940` reported broken podcast media after text edits. Admin `getAdminBlogs` returns signed Bunny URLs with `token`, `expires`, and `class` query parameters, for example `https://ssl-production.b-cdn.net/USER/.../image/....jpg?token=...&expires=...&class=normal`.

## Tracing Evidence

Not applicable. This is a write-path logic defect, not a live trace failure.

## PostHog Evidence

The Superthread card did not include a PostHog session or error-tracking link.

## Root Cause Analysis

The admin editor loads signed media URLs and resubmits `featuredImage`, `logo`, `cover`, and `file` on every save. `updateBlog` then compared origin plus pathname strings instead of Bunny storage keys, so a relative stored path and a signed full URL looked like a replacement. `cleanupChangedMedia` deleted the old Bunny object before validation and before Mongo update success.

The update page sanitizer also converted omitted media fields into empty strings, which could clear media on sparse payloads.

**Related files:**
- [blog-write.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.ts)
- [blog.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog.page.tsx)
- [blog-form.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog-form.tsx)
- [blog.presenter.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog.presenter.ts)

## Fix Applied

Compare media by decoded Bunny storage key, persist unsigned canonical CDN URLs, and delete replaced objects only after a successful Mongo update. Admin updates omit unchanged media and stop filling omitted fields with empty strings. Audio uploads now allow 500 MB. A migration canonicalizes stored URLs, and `pnpm --prefix ssl-be blog:media-audit` reports missing Bunny objects for backup restore.

## Unit / Regression Test

- **Test File:** [blog-write.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/blog/blog-write.service.test.ts src/modules/upload/upload.constant.test.ts`
- **Test Results:** Backend 9 passed (`blog-write.service.test.ts`, `upload.constant.test.ts`). Admin payload 4 passed (`blog-form.payload.test.unit.ts`). Production HEAD of 10 list-view featured images: 6 still 200, 4 already 404. Missing objects still need backup restore via `pnpm --prefix ssl-be blog:media-audit`. Live admin save smoke was not run (no local admin server).

## Lessons Learned

Never treat presentation URLs as storage identity. Never delete remote files before the database write that replaces them.

## References

- Superthread: [#940](https://superthread.com)
