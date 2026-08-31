# BUG-107: Community profile/cover empty after select or upload

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-25
> **Date Fixed:** 2026-08-25
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

C-998: after a Community Cover or profile (logo) image was selected or cropped in the create/edit Design step, the upload area stayed an empty dashed field instead of showing the image.

## Reproduction steps

1. Open Create Community or Edit Community.
2. Go to the Design step.
3. Select a cover image and confirm the crop. Repeat for the profile image.

**Expected behavior:** The chosen image fills the cover banner and the square profile slot.
**Actual behavior:** Both slots stay empty until a full remount, and a GetCommunity refetch could wipe a just-picked file.

## Evidence

Superthread C-998 screenshots: empty cover field and empty profile field after an image was selected/uploaded.

## Tracing evidence

Jaeger was not required. This is a frontend wizard preview / form-hydration bug. No GraphQL write failed.

## PostHog evidence

C-998 had no PostHog session or error link.

## Root cause analysis

Two paths produced the same empty field:

1. Crop complete only stored a `File`. The `<img>` waited on a later `createObjectURL` effect. If that preview was missing, `getCommunityCoverPreviewUrl` returned `''` and the dashed empty state rendered.
2. Edit mode hydrates the form from `editCommunity` on every `cache-and-network` update and always set `coverFile` / `logoFile` to `null`. A refetch after crop cleared the pending file and left an empty field when the server URL was not yet displayable.

**Related files:**
- [step-design.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/create-wizard/step-design.tsx)
- [page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/create/page.client.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

Crop confirm now writes the cropper data URL into the preview immediately. Edit hydration merges server cover/logo without discarding a pending local file. Submit still uploads the `File` and never sends a `data:` / `blob:` preview as the stored URL.

## Unit / regression test

- [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- [communities.type.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test results:** Cropped cover/logo stay displayable; a GetCommunity-shaped refetch does not wipe a pending file; submit rejects data/blob previews.

## Lessons learned

Wizard image state that lives in React `File` plus a separate preview URL must survive Apollo cache-and-network identity changes. Do not reset pending files on every `editCommunity` object.

## References

- Superthread: [C-998](https://app.superthread.com/cnlgaming/card-998-fb-community-profilecover-image-not-displaying)
- Related: [BUG-080](BUG-080-community-edit-cover-broken-image.md)
