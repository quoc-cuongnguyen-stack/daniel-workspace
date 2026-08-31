# BUG-087: Community notifications missing from the popup

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-fe-user)
> **Severity:** High

## Description

A new community post created `COMMUNITY_NEW_POST` for other members. The sidebar bell could show a badge, but the Notifications popup stayed on "No notifications yet".

## Reproduction steps

1. As member A, create a post in a community that has member B.
2. Log in as member B and open Notifications.

**Expected behavior:** Member B sees a community-post row such as "[User] has created a new post in [Community]".
**Actual behavior:** The list is empty. Age-verification copy can still appear as a pinned banner.

## Evidence

Local screenshot on `localhost:8001/en`: popup title "Notifications", age-verify banner, golden bell, "No notifications yet", sidebar bell with a unread dot.

## Tracing evidence

Jaeger was not required. The create path already dispatched `COMMUNITY_NEW_POST`. The list query never asked for that type.

## PostHog evidence

Not used. This was reproduced locally.

## Root cause analysis

`getNotifications` honors an explicit `type` array from the client. The popup sends `DEFAULT_NOTIFICATION_TYPES`, which omitted every `COMMUNITY_*` value. The unread counter uses backend `OTHER_TYPES`, which already includes those values, so the badge and the list disagreed.

The post author is still excluded from `notifyNewPost`. Checking the author's own popup after creating a post will not show that event.

**Related files:**
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)

## Fix applied

`COMMUNITY_NOTIFICATION_TYPES` is exported and spread into `DEFAULT_NOTIFICATION_TYPES`, so the popup loads community events with the rest of the feed.

## Unit / Regression Test

- **Test File:** [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Command:** `./node_modules/.bin/vitest run --config src/shared/vitest/vitest.config.unit.ts src/modules/notification/notification.utils.test.unit.ts`
- **Test Results:** `COMMUNITY_NOTIFICATION_TYPES` includes `COMMUNITY_NEW_POST` and `COMMUNITY_APPLICATION_RECEIVED`.

## Lessons Learned

When the client sends a type whitelist, new backend enum values must be added to that list or the counter and the popup will drift.

## References

- Related bug cases: BUG-078, BUG-086
