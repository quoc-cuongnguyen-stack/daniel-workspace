# BUG-078: Community post used gallery review copy and unread count jumped

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

C-958: when a member created a community post, the community admin's Notifications popup showed gallery image-review copy (`Almost there! Your image is being reviewed and will be available shortly`). Clicking an already-read notification still decreased the badge. Clicking an unread notification then jumped the count (for example 6 to 10).

## Reproduction steps

1. As a community member, create a community post with one or more images.
2. Open Notifications as the community admin.
3. Click an already-read notification, then an unread one.

**Expected behavior:** The admin sees a new-community-post notice such as `[User] has created a new post in [Community Name]`. Reading an already-read item does not change the badge. Reading an unread item decreases it by one without a jump.

**Actual behavior:** The newest notices used gallery review copy. The badge decreased on already-read clicks and later jumped up.

## Evidence

Superthread C-958 screenshot `image_095971.png` showed two newest notices with the gallery pending headline.

## Tracing evidence

Jaeger was not required. This is notification type/copy and counter logic.

## PostHog evidence

C-958 had no PostHog session or error link.

## Root cause analysis

Community image uploads reuse `createModerationMedia`. Pending community files sent `MODERATION_MEDIA_PENDING` with gallery copy. `notifyNewPost` stored `COMMUNITY_NEW_POST` without community name, slug, or headline, so the popup could not describe the new post.

`markNotificationRead` always published `NOTIFICATION_READ`, including for items that were already read. The header subscription decremented on every event, so already-read clicks lowered the local badge. A later refetch restored the server count and the badge jumped.

**Related files:**
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [moderation-media.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.controller.ts)
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)
- [notification.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.hook.ts)
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)

## Fix applied

- Skip gallery pending notices for `E_UploadEntity.COMMUNITY`.
- Send `COMMUNITY_NEW_POST` with headline, community name, and feed slug.
- Do not publish a read event when the notification is already read.
- Skip `markRead` for already-read rows and dedupe read-subscription decrements.

## Unit / regression test

- **Test files:**
  - [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts)
  - [moderation-media.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/moderation/moderation-media/moderation-media.util.test.ts)
  - [notification.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.util.test.ts)
  - [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
  - [notification.counter.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.counter.test.unit.ts)
- **Commands:** targeted vitest in `ssl-be` and `ssl-fe-user`

## Lessons learned

Do not reuse gallery moderation copy for community uploads. Counter subscriptions must ignore already-read events.

## References

- Superthread: [C-958](https://app.superthread.com/cnlgaming/card-958-bug-incorrect-notification-message-sent-to-community-admin-when-a-new-community-post-is-createdd)
