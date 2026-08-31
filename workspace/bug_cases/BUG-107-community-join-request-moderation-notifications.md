# BUG-107: Community join-request moderation notifications

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-23
> **Date Fixed:** 2026-08-23
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** Medium

## Description

Approving or rejecting a private-community join request from the Notifications popup left the Approve and Reject buttons in place, inserted a generic "New notification" row, and showed a broken avatar on the applicant's "Your application to the community was approved!" item instead of the community logo.

## Reproduction steps

1. As a non-member, request access to a private community.
2. As the community administrator, open Notifications and approve or reject the request.
3. Stay on the Notifications popup, then open the applicant account's Notifications.

**Expected behavior:** The original request shows Approved or Rejected and the action buttons are gone. Other members see "[username] has joined [community]". The applicant sees the approval copy with the community logo.
**Actual behavior:** Approve/Reject stayed clickable. A "New notification" row appeared. The approval item used a broken reviewer avatar.

## Evidence

Superthread [C-993](https://app.superthread.com/cnlgaming/card-993-bug-approve-and-reject-buttons-do-not-disappeardisable-after-taking-action-in-notifications-modal). Screenshots from the Notifications popup after approve.

## Tracing evidence

Jaeger was not required. The review path succeeded; the popup lost the local decision on refetch and rendered an unhandled `COMMUNITY_MEMBER_JOINED` type.

## PostHog evidence

No PostHog link on C-993.

## Root cause analysis

`notifyMemberJoined` created a notification with no presentation, and `fallbackNotificationText` had no `COMMUNITY_MEMBER_JOINED` case, so the popup showed "New notification". Approve/Reject visibility was only React state, which reset when the member-joined item triggered a notifications refetch. `notifyApplicationReviewed` stored no community logo, and listing overwrote `actor.avatarUrl` with the reviewer's gallery URL.

**Related files:**
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [community-application.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.ts)
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)

## Fix applied

Persist `presentation.context.applicationStatus` on the original received notifications before broadcasting the member-joined event. Give member-joined and application-reviewed notifications a presentation (username, community name, community logo). Keep the stored community logo instead of the reviewer gallery. Hide Approve/Reject when a local or persisted decision exists.

## Unit / Regression Test

- **Test File:** [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts), [notification.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.util.test.ts), [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts), [notification.utils.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-be test:unit` and `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test Results:** Approval notifications include the community logo. Member-joined copy is not "New notification". Approve/Reject hide after a persisted or local decision.

## Lessons Learned

Realtime refetch of the notification list drops component state. Persist the review outcome on the original notification, and never ship a notification type without fallback copy and presentation.

## References

- Related bug cases: BUG-086, BUG-091
- Superthread: [C-993](https://app.superthread.com/cnlgaming/card-993-bug-approve-and-reject-buttons-do-not-disappeardisable-after-taking-action-in-notifications-modal)
