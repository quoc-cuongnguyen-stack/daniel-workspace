# BUG-074: Community post image is a placeholder after publish

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

After posting a photo, the feed showed a dark placeholder tile instead of the image. There was no Pending badge. The user expected a visible image with a Pending badge while Admin review is outstanding.

## Reproduction steps

1. Upload a community photo that AI flags as Pending.
2. Publish the post.
3. Open the community feed.

**Expected behavior:** The photo stays visible with a Pending badge. Only Admin reject blurs it.
**Actual behavior:** The tile rendered with no URL, so the image and badge were missing.

## Evidence

Screenshot: post card with a generic landscape icon and no Pending badge.

## Tracing evidence

Jaeger was not used. The post and media ids were present; the URL lookup missed.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

`createPost` rewrote each attachment `entityId` from the community id to the post id. `GetCommunityMedia` still queried `{ entity: COMMUNITY, entityId: communityId }`, so the signed URL never loaded. The Pending overlay only renders when that URL resolves.

This is independent of BUG-073's status filter. Pending was the case the user hit because AI-flagged photos take that path.

**Related files:**
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [moderation-media.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.ts)
- [communities.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.hook.ts)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

- Keep new attachments scoped to the community id.
- Resolve feed, gallery, and moderator media by the post `mediaIds` (`options.ids`).
- Refetch media after create so the new id is in the map.

## Unit / Regression test

- **Test File:** [moderation-media.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.test.ts), [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts), [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/moderation/moderation-media/moderation-media.util.test.ts src/modules/community/community-post.controller.test.ts` and `pnpm --prefix ssl-fe-user exec vitest --config src/shared/vitest/vitest.config.unit.ts run src/modules/communities/communities.type.test.unit.ts`

## Lessons learned

Status-only visibility fixes are not enough if the URL query keys off a field that publish rewrites.

## References

- Related bug cases: BUG-073
