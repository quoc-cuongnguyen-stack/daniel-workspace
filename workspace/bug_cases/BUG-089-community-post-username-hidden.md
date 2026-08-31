# BUG-089: Community new-post username hidden in the popup

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-fe-user)
> **Severity:** Medium

## Description

`getNotifications` returned `presentation.actor.username: "Sweetcandy"` and a headline that already included that name. The popup still rendered "has created a new post in Community for TC-01".

## Reproduction steps

1. Receive a `COMMUNITY_NEW_POST` whose actor has a username and `accountType: null`.
2. Open Notifications.

**Expected behavior:** The row starts with the actor username.
**Actual behavior:** The row starts with "has created a new post in".

## Evidence

Local GraphQL payload for `c5ace183-2b9e-4435-819b-a3f8da976cab` included `actor.username: "Sweetcandy"` and `accountType: null`. Screenshot showed the sentence without the name.

## Tracing evidence

Jaeger was not required. This is popup render logic.

## PostHog evidence

Not used.

## Root cause analysis

`NotificationListItem` only prepended `result.username` when `result.usernameClass` was also truthy. `getProfileNameClass` returns `''` when `accountType` is missing, so the name was dropped even though the API sent it.

**Related files:**
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)

## Fix applied

Render the username whenever it exists. `getProfileNameClass` now falls back to `text-white` when account type is unknown.

## Unit / Regression Test

- **Test File:** [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Command:** `./node_modules/.bin/vitest run --config src/shared/vitest/vitest.config.unit.ts src/modules/notification/notification.utils.test.unit.ts`
- **Test Results:** Missing account type still returns a visible class.

## Lessons Learned

Do not gate visible copy on a CSS class. A missing style must not hide the actor name.

## References

- Related bug cases: BUG-088
