# BUG-007: Media Liked Notification Missing photoVideoLike User Setting Check

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## 🔍 Description

When a user liked a media item (photo/video in Gallery), push and email notifications were evaluating recipient channel suitability without checking the recipient's `photoVideoLike` notification preference setting, potentially sending push notifications when user settings or channels expected preference validation or failing setting checks.

## 🔄 Reproduction Steps

1. User A likes a photo uploaded by User B.
2. `like.controller.ts` calls `notificationCtr.createNotificationWithSettings`.
3. `createNotificationWithSettings` evaluated `MEDIA_LIKED` notification channels without extracting and checking `s.photoVideoLike`.

**Expected behavior:** `MEDIA_LIKED` notifications evaluate `s.photoVideoLike` user setting when determining EMAIL and PUSH channels.
**Actual behavior:** `MEDIA_LIKED` bypassed the `photoVideoLike` setting check in channel evaluation.

## 🧠 Root Cause Analysis

In `notification.controller.ts`, the `s` setting mapping object omitted `photoVideoLike: rawSettings.photoVideoLike !== false`. Consequently, `has(E_NotificationType.MEDIA_LIKED)` added `PUSH` and `EMAIL` channels unconditionally without respecting `s.photoVideoLike`.

**Related files:**
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)
- [user.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user.type.ts)
- [like.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/like/like.controller.ts)

## 🔧 Fix Applied

1. Extended `I_UserSettings_Notification` interface in `user.type.ts` to include `photoVideoLike?: boolean`.
2. Updated `s` notification settings mapping in `notification.controller.ts` to include `photoVideoLike: rawSettings.photoVideoLike !== false`.
3. Updated channel resolution in `notification.controller.ts` so `MEDIA_LIKED` checks `has(E_NotificationType.MEDIA_LIKED) && s.photoVideoLike` for both EMAIL and PUSH channels.

## 🧪 Unit / Regression Test

- **Test File:** [media-liked-notification.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/media-liked-notification.test.ts)
- **Command:** `pnpm test:unit src/modules/notification/media-liked-notification.test.ts`
- **Test Results:** 2 tests passed (verified `MEDIA_LIKED` adds `PUSH`/`EMAIL` when `photoVideoLike` is enabled/default and suppresses `PUSH`/`EMAIL` when `photoVideoLike` is `false`).

## 📝 Lessons Learned

- Always ensure new notification type settings present in UI/schema are explicitly mapped in `createNotificationWithSettings` helper functions.
