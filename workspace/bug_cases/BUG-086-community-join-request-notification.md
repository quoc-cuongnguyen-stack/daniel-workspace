# BUG-086: C-978 private join request did not notify the administrator

> **Status:** Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** High

## Description

C-978: when someone requests to join a private community, the administrator must receive a notification such as "A member has requested to join your Community." and be able to approve or reject the request.

`applyToCommunity` created the pending application and never dispatched `COMMUNITY_APPLICATION_RECEIVED`.

## Reproduction steps

1. Log in as a non-member of a private community.
2. Submit a join request.
3. Log in as that community's administrator and open Notifications.

**Expected behavior:** An in-app notification with the join-request copy. Opening it goes to the moderator page so the request can be approved or rejected.
**Actual behavior:** No notification was created.

## Evidence

[C-978](https://app.superthread.com/cnlgaming/card-978-fb-community-membership-3). `applyToCommunity` returned `createOne` with no call into `communityNotificationService`.

## Tracing evidence

Jaeger was not required. The apply path never called the notification service.

## PostHog evidence

No PostHog link on C-978.

## Root cause analysis

`COMMUNITY_APPLICATION_RECEIVED` existed on the enum and in the frontend community-path set, but nothing created that notification. Only `notifyApplicationReviewed` ran, and only after approve/reject.

**Related files:**
- [community-application.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.ts)
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)

## Fix applied

`notifyApplicationReceived` notifies ADMIN and MODERATOR members, plus the creator if they are missing from that list. `applyToCommunity` calls it after a successful create. The notification headline matches C-978. The payload stores the application id on `redirect.entityId`, so the popup can approve or reject the request and the click path opens `/communities/<slug>/moderator?applicationId=...`.

## Unit / Regression Test

- **Test File:** [community-application.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.test.ts), [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts), [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Command:** `./node_modules/.bin/vitest run src/modules/community/community-application.controller.test.ts src/modules/community/community-notification.service.test.ts` and the FE unit config for `notification.utils.test.unit.ts`
- **Test Results:** Public apply does not notify. Private apply calls `notifyApplicationReceived`. Admins and the creator receive `COMMUNITY_APPLICATION_RECEIVED` with the C-978 headline. The frontend path is the moderator page.

## Lessons Learned

Adding a notification enum is not enough. The create path has to emit it, and the click path has to land on the screen where the admin can act.

## References

- Related bug cases: BUG-078, BUG-084
- Superthread: [C-978](https://app.superthread.com/cnlgaming/card-978-fb-community-membership-3)
