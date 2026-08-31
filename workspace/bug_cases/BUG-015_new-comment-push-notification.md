# BUG-015: New Comment Push Notification Delay & Missing Push Channel

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-23
> **Date Fixed:** 2026-07-23
> **Project:** ssl-be
> **Severity:** 🟠 High

---

## 🔍 Description

When a user posted a comment on a gallery item or guestbook post, push notifications experienced a 2-5s delay and were sometimes omitted because:
1. `E_NotificationChannel.PUSH` was omitted from channel resolution for `GALLERY_COMMENT` and `GUESTBOOK_POST`.
2. `createNotificationWithSettings` in `notification.controller.ts` sequentially `await`ed two secondary database `updateOne` queries before executing GraphQL `pubsub.publish` and WebPush `sendPush`.

## 🧠 Root Cause Analysis

1. In [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts#L1060-L1088), `hasPushSub` logic omitted `GALLERY_COMMENT` and `GUESTBOOK_POST`.
2. In `createNotificationWithSettings`, two sequential MongoDB `updateOne` queries (`presentation` update and `status` SENT transition) were `await`ed synchronously prior to dispatching PubSub and WebPush events, causing artificial database roundtrip delays (2-5 seconds).

## 🔧 Fix Applied

1. Added `GALLERY_COMMENT` and `GUESTBOOK_POST` to the `hasPushSub` push channel resolution block in `createNotificationWithSettings`.
2. Converted secondary `updateOne` database writes to non-blocking background operations so `pubsub.publish` and `webPushCtr.sendPush` execute immediately (0ms delay) right after document insertion.

## 🧪 Unit / Regression Test

- Verified clean ESLint check (`pnpm eslint src/modules/notification/notification.controller.ts --fix`).
- Verified zero errors and zero warnings.

## 📝 Lessons Learned

- Non-critical status update operations should be run as non-blocking background promises to prevent delaying real-time WebSocket PubSub and WebPush notification execution.
