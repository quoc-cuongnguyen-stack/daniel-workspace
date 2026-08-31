# BUG-076: Pending community image stays public; only status is owner-only

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

BUG-075 hid pending photos from everyone except the owner. The correct rule is: the image stays visible to every member. Only the Pending badge and status field are for the owner. Admin reject still blurs the image for everyone.

## Reproduction steps

1. User A posts a photo that AI marks Pending.
2. User B opens the same community feed.

**Expected behavior:** User B sees the photo without a Pending badge. User A sees the photo with Pending.
**Actual behavior:** User B did not see the photo at all.

## Evidence

User correction after BUG-075.

## Tracing evidence

Jaeger was not used.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

BUG-075 treated "status is owner-only" as "image is owner-only" and stripped pending ids and URLs for other members.

**Related files:**
- [community-post.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.ts)
- [moderation-media.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.ts)
- [community-media-status.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-status.tsx)

## Fix applied

- Keep pending media ids and URLs for every viewer.
- Redact `status` and `reason` on community pending rows unless the viewer is the uploader or platform staff.
- Show the Pending badge only when the viewer is the post owner.
- Rejected media still blurs for everyone.

## Unit / Regression test

- **Test File:** [moderation-media.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.test.ts), [community-post.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.test.ts), [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community-post.service.test.ts src/modules/community/community-post.controller.test.ts src/modules/moderation/moderation-media/moderation-media.util.test.ts` and `pnpm --prefix ssl-fe-user exec vitest --config src/shared/vitest/vitest.config.unit.ts run src/modules/communities/communities.type.test.unit.ts`

## Lessons learned

Visibility of the file and visibility of the moderation label are separate rules.

## References

- Related bug cases: BUG-073, BUG-074, BUG-075
