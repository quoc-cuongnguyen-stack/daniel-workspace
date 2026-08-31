# BUG-091: Community join-request notification text

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-18
> **Date Fixed:** 2026-08-18
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** 🟡 Medium

---

## Description

A private community join request showed as `SweetcandyA member has requested to join your Community.Community private` instead of `Sweetcandy has requested to join your Community private`.

## Reproduction steps

1. Request to join a private community as a non-member.
2. Open the administrator notification popup.

**Expected behavior:** `${username} has requested to join your ${nameOfCommunity}`.
**Actual behavior:** Username, a generic headline, and the community name were concatenated with no spaces.

## Evidence

Local popup for `COMMUNITY_APPLICATION_RECEIVED` rendered:

```
SweetcandyA member has requested to join your Community.Community private
```

## Tracing evidence

Jaeger was not required. This is in-app copy composition.

## PostHog evidence

Not used. No session link was provided.

## Root cause analysis

`fallbackNotificationText` used `presentation.headline` (`A member has requested to join your Community.`) as the middle text, then the page prepended `username` and appended `groupName`. The headline already contained a full sentence and had no leading or trailing spaces.

**Related files:**
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)

## Fix applied

- Use the i18n fragment ` has requested to join your ` between username and community name.
- Ignore the stored headline for this type so older notifications render the same sentence.
- Store a matching full headline for push and other consumers that read `presentation.headline`.

## Unit / Regression test

- **Test File:** [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Test File:** [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts)
- **Command:** `pnpm --prefix ssl-fe-user exec vitest run src/modules/notification/notification.utils.test.unit.ts` and `pnpm --prefix ssl-be exec vitest run src/modules/community/community-notification.service.test.ts`
- **Test Results:** Join-request copy is `Sweetcandy has requested to join your Community private` even when the stored headline is the old generic sentence.

## Lessons learned

Notification types that color username and community name separately need a middle fragment with spaces, not a complete sentence in `headline`.

## References

- Related bug cases: BUG-086, BUG-088, BUG-090
