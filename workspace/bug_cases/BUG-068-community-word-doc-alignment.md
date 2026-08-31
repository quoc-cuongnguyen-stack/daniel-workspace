# BUG-068: Community behavior conflicted with the finished Word spec

> **Status:** Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-be, ssl-fe-user, ssl-fe-admin)
> **Severity:** High

## Description

`Færdig_Comunity Projekt.docx` is the customer contract for Communities. The branch still enforced paid-only create/post rules from later workspace specs, showed per-community points on applications, labeled member cards as Activity, accepted any header image type, skipped last-admin orphan notices, and hid the in-community admin shortcut from platform admins.

## Reproduction steps

1. Log in as a free SecretSwingerLust member and open Create Community or try to post.
2. Open a private-community application card and a member card.
3. Upload a WebP header image in the Design step.
4. Leave a community as its last administrator.
5. Open a community as a platform admin who is not a member.

**Expected behavior:** Any logged-in member can create and post. Application cards show cross-forum points. Member cards say Points. Header images are JPG/PNG only. Remaining members get `COMMUNITY_ORPHANED`. Platform admins can open the in-community Administrator Panel.

**Actual behavior:** Free members were blocked. Points were per-community. The card said Activity. WebP uploaded. Last-admin leave did not notify. Platform admins had no working shortcut or API access.

## Evidence

Word doc §12, §13, §14, §16, §17. Paid create/post gates lived in `community.controller.ts`, `community-post.controller.ts`, and the create wizard.

## Tracing evidence

Jaeger was not used. This is a spec-alignment change, not a runtime incident.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

Later workspace specs (DEC-SSL-240, FR-COMM-001, BUG-067) overrode the Word doc. The create wizard and post/comment APIs checked `isPaidMember`. Application points used the current community membership only. Header upload accepted any image. `leaveCommunity` set `ORPHANED` without `notifyCommunityOrphaned`. Moderator APIs required a community ADMIN/MODERATOR membership.

**Related files:**
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [community-points.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-points.service.ts)
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

Removed paid create/post/comment gates. Locked "Only SecretSwingerLust members can post" as a default platform rule. Applications now attach `getTotalActivityPoints`. Member cards use the Points label. Header upload accepts JPG/PNG only. Last-admin leave notifies remaining members. Mute skips join notifications. Archived communities reject new posts/comments. Platform admins can open and use the in-community admin panel. Admin tag form includes `COMMUNITY`.

## Unit / regression test

- **Test File:** [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts), [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts), [community-points.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-points.service.test.ts), [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts), [community-application.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.test.ts), [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/community src/modules/cron/tasks/community-orphan.task.test.ts src/modules/cron/tasks/community-post-expiry.task.test.ts` and `pnpm --prefix ssl-fe-user test:unit src/modules/communities/communities.type.test.unit.ts`
- **Test Results:** 42 backend tests passed. 4 frontend type tests passed. Free members can create, post, and comment. Archived communities reject writes. Applications attach cross-community points. Last-admin orphan notify and mute-join filters are covered. Header JPG/PNG and platform-admin helpers are covered.

## Lessons learned

When the user names one document as the sole source of truth, later internal specs must not keep paid-only or extra posting-permission rules.

## References

- Source of truth: `daniel_workspace/feature-requests/Færdig_Comunity Projekt.docx`
- Related: [BUG-067](BUG-067-community-create-paid-member-step1.md) (paid create gate, now reversed)
