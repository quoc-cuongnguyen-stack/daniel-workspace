# BUG-137: Community JPEG crop/upload needed several attempts

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-31
> **Date Fixed:** 2026-08-31
> **Project:** SSL (ssl-fe-user / ssl-be)
> **Severity:** 🟠 High

---

## 🔍 Description

Selecting a JPEG for the community banner or profile image often required ~5 Save/submit attempts before the crop exported and the create/update mutation ran. Users could also advance the wizard without both required images.

## 🔄 Reproduction Steps

1. Create Community → Design.
2. Pick a large phone JPEG for the wide banner (or square profile image).
3. Click Save as soon as the crop modal appears, then submit.

**Expected behavior:** Save waits until the image has decoded and a non-zero crop exists. One Save produces a JPEG; a failed upload never continues the mutation. Both banner and logo are required.
**Actual behavior:** Early Save ran against an undecoded / zero-size image; `toBlob` returned null on huge canvases; JPEG fast-path accepted 0×0 decode; submit could continue without a CDN URL.

## 📸 Evidence

Wizard Design step: crop Save available before the image painted; intermittent empty canvas export.

## 🔭 Tracing Evidence

N/A (client crop/convert; no backend span).

## 📊 PostHog Evidence

N/A for this capture-driven fix.

## 🧠 Root Cause Analysis

1. Crop Save was clickable before `onImageLoad` and a completed crop.
2. Image-load fallback resolved on error instead of rejecting; failures were silent.
3. Huge phone JPEGs exported at native size so `canvas.toBlob` returned null.
4. JPEG fast-path returned the original file when `naturalWidth`/`naturalHeight` were 0.
5. Wizard allowed empty banner/logo and continued the mutation after a missing upload URL.

**Related files:**
- [image-cropper-modal.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/image-cropper-modal.tsx)
- [image-cropper.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/image-cropper.util.ts)
- [image-converter.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/util/image-converter.ts)
- [step-design.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/create-wizard/step-design.tsx)
- [page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(main)/(communities)/communities/create/page.client.tsx)
- [community.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.ts)

## 🔧 Fix Applied

- Disable Save until decode (`naturalWidth/Height > 0`) and a non-zero crop.
- Reject image-load failures; toast on crop/export errors.
- Cap crop export long edge at 4096.
- JPEG fast-path requires positive decoded dimensions ≤ 4096.
- Wizard 20 MB limit; Design blocks Next without both images; submit aborts if upload returns no URL.
- Backend create/update require non-empty `coverImage` + `logo`.

## 🧪 Unit / Regression Test

- **Test File:** image-cropper-modal.test.unit.tsx, image-cropper.util.test.unit.ts, image-converter.test.unit.ts, community-cover-preview.test.unit.tsx, communities.type.test.unit.ts, communities.type.test.e2e.ts, community.controller.test.ts
- **Command:** `pnpm --prefix ssl-fe-user exec dotenvx run -- vitest run --config src/shared/vitest/vitest.config.unit.ts` (cropper/converter/design); FE e2e communities.type; BE community.controller
- **Test Results:** Save disabled before decode; 4096 export cap; 20 MB reject; 0-dimension JPEG not fast-pathed; Design Next blocked; submit helper strips data/blob URLs; create/update reject missing images.

## 📝 Lessons Learned

- Do not treat `onload` as “ready to encode” without positive natural dimensions.
- Cap canvas export size; huge `toBlob` is intermittent, not deterministic.
- A local crop preview (`data:`/`blob:`) is not a stored image — strip it before the mutation.

## 🔗 References

- Plan: community_lifecycle_uploads
- Related: [BUG-136](BUG-136-last-admin-leave-empty-community.md), [BUG-107](BUG-107-community-profile-cover-empty-after-select.md)
