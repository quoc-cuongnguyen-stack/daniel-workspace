# BUG-088: Community comment and reaction notifications missing context

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** High

## Description

Comment and reaction community notifications rendered as "commented on your post." and "reacted to your post." with no username. Clicking them opened `/communities` instead of that community's feed.

## Reproduction steps

1. Member B comments on or reacts to member A's community post.
2. Member A opens Notifications and clicks the row.

**Expected behavior:** The row names the actor. Clicking it opens `/communities/<slug>/feed`.
**Actual behavior:** The actor name is blank. Clicking it opens the community index.

## Evidence

Local screenshot: two rows, "commented on your post." and "reacted to your post.", about 4 hours ago, no username.

## Tracing evidence

Jaeger was not required. `_notifyUser` stored only `actorId`, `targetId`, and `type`.

## PostHog evidence

Not used. This was reproduced locally.

## Root cause analysis

`notifyNewComment` and `notifyReaction` reused `_notifyUser`, which did not write `presentation.actor.username`, `presentation.context.groupName`, or `presentation.redirect.id`. The popup reads the username from `presentation.actor` and the path from `redirect.id`. A missing slug falls back to `/communities`.

`getNotifications` already loaded actors for avatars but did not copy `username` onto `presentation.actor` when it was absent.

**Related files:**
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [community-post.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.ts)
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)

## Fix applied

Comment and reaction notifies now store actor username, community name, and feed slug. `getNotifications` fills a missing actor username from the actor lookup so older rows can at least show a name. New rows redirect to `/communities/<slug>/feed`.

## Unit / Regression Test

- **Test File:** [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts), [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Command:** targeted vitest in `ssl-be` and `ssl-fe-user`
- **Test Results:** Comment and reaction payloads include actor, group name, and slug. A comment with a slug opens the feed. A reaction without a slug still opens `/communities`.

## Lessons Learned

Community notify helpers that only pass ids are not enough for the popup. The create payload has to carry the same presentation fields the list already knows how to render.

## References

- Related bug cases: BUG-078, BUG-087
