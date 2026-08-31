# BUG-073: AI-flagged community images hidden instead of Pending / blur

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

When AI flags a community image, it already goes to Admin as PENDING. The feed and gallery then stripped those ids, so the uploader could not see the image or a Pending badge. After Admin reject, the image disappeared instead of staying in place as a blur.

## Reproduction steps

1. Post a community photo that AI flags.
2. Open the feed or gallery as the uploader.

**Expected behavior:** The image stays visible with a Pending badge. Admin approve removes the badge. Admin reject blurs the image.
**Actual behavior:** The image vanished until it was approved.

## Evidence

`hideUnapprovedPostMedia` and `getCommunityGallery` only kept `APPROVED` media. `useCommunityMediaById` also dropped `REJECTED` ids.

## Tracing evidence

Jaeger was not used. This is a visibility rule on top of the existing AI + admin moderation flow.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

AI already maps a reject decision to PENDING and notifies Admin. Community reads then hid every non-approved attachment.

**Related files:**
- [community-post.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [community-media-status.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-status.tsx)

## Fix applied

- Keep PENDING and REJECTED media ids on posts and in the gallery query.
- Show a Pending badge on flagged images. Keep the image visible.
- After Admin approve, the badge goes away.
- After Admin reject, blur the image and block the lightbox.

## Unit / Regression test

- **Test File:** [community-post.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.test.ts), [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community-post.service.test.ts src/modules/community/community-post.controller.test.ts`

## Lessons learned

Admin review status has to stay on the payload. Hiding non-approved ids makes Pending and blur impossible.

## References

- Related bug cases: BUG-072, BUG-074
