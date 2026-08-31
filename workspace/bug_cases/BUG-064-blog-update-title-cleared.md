# BUG-064: Blog update form Title field clears after repeated saves

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-14
> **Date Fixed:** 2026-08-14
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

After updating the same blog or podcast multiple times in admin, reopening the edit form shows an empty Title field even though the record still has a title in other locales or in list views.

## Reproduction Steps

1. Open admin blog edit for an existing localized post.
2. Save the form without clearing Title.
3. Reopen the same post and save again.
4. Reopen once more.

**Expected behavior:** Title remains populated with the English value on every reopen.
**Actual behavior:** Title input is empty after repeated updates.

## Evidence

- Admin form submits `title` as a plain English string.
- Backend previously persisted that string directly, replacing the multilingual `{ en, da, ... }` object.
- `updateBlog` returns the raw Mongo document (no `presentBlog`), so Apollo cache can store multilingual JSON for `title` / `seo.title`.
- `getAdminBlog` used `cache-first`, so later opens could load those raw objects into inputs.
- Native text inputs treat object values as empty, so Title appears cleared.

## Root Cause

1. Localized title writes were not normalized/merged to `{ en }` on update.
2. Form open/sanitize paths did not coerce multilingual JSON into plain strings for Title and SEO text fields.
3. Edit fetch reused mutation cache instead of a fresh presented admin read.

## Resolution

1. Backend `normalizeBlogLocalizedPayload` wraps string `title` / headline / content fields as `{ en }` and merges into existing locale maps.
2. Frontend `buildBlogFormValues` flattens localized fields to English strings before `reset`.
3. Title and SEO text inputs coerce values through `getBlogFormText`.
4. `useGetBlogLazy` uses `network-only` for edit opens.
5. Podcast thumbnail sync and shared-media cleanup were left unchanged.

## Files Changed

- `ssl-be/src/modules/blog/blog-write.service.ts`
- `ssl-be/src/modules/blog/blog-write.service.test.ts`
- `ssl-fe-admin/src/modules/blog/blog-form.payload.ts`
- `ssl-fe-admin/src/modules/blog/blog-form.payload.test.unit.ts`
- `ssl-fe-admin/src/modules/blog/blog-form.tsx`
- `ssl-fe-admin/src/modules/blog/blog.hook.tsx`

## Verification

- `pnpm --prefix ssl-be exec vitest run --watch=false src/modules/blog/blog-write.service.test.ts` PASSED
- `pnpm --prefix ssl-fe-admin test:unit -- run src/modules/blog/blog-form.payload.test.unit.ts` PASSED
- IDE diagnostics on changed files: no issues
