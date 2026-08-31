# BUG-075: Pending community images visible to every member

> **Status:** ⚠️ Superseded by BUG-076
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

After BUG-074 restored pending image URLs, every community member could see the photo while it was still awaiting Admin review. Only the post owner should see a pending image (with a Pending badge). Other members should not see it. Admin reject still blurs the image for everyone.

## Reproduction steps

1. User A posts a photo that AI marks Pending.
2. User B opens the same community feed or gallery.

**Expected behavior:** User A sees the photo with Pending. User B does not see that image.
**Actual behavior:** User B saw the same photo.

## Evidence

User report after the BUG-074 URL-resolution fix.

## Tracing evidence

Jaeger was not used. This is a visibility rule on the existing feed and gallery reads.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

BUG-073/074 kept PENDING ids and signed URLs for every viewer. There was no owner check on `hideUnapprovedPostMedia`, the gallery media set, or `getModerationMedias`.

**Related files:**
- [community-post.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [moderation-media.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.ts)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

- Strip pending media ids from posts unless the viewer is the author or uploader.
- Exclude other members' pending ids from the gallery candidate set.
- Do not return community pending rows from `getModerationMedias` except to the uploader or platform staff.
- Frontend also hides pending tiles and lightbox items for non-owners.

## Unit / Regression test

- **Test File:** [community-post.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.test.ts), [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts), [moderation-media.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.test.ts), [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community-post.service.test.ts src/modules/community/community-post.controller.test.ts src/modules/moderation/moderation-media/moderation-media.util.test.ts` and `pnpm --prefix ssl-fe-user exec vitest --config src/shared/vitest/vitest.config.unit.ts run src/modules/communities/communities.type.test.unit.ts`

## Lessons learned

Owner-only pending visibility has to live on the read path. Restoring the URL for the author also restored it for everyone until the viewer was checked.

## References

- Related bug cases: BUG-073, BUG-074
