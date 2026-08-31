# BUG-127: Community new-post notification persisted but bell did not update via WebSocket

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-29
> **Date Fixed:** 2026-08-29
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

After BUG-125, admins/mods received a `COMMUNITY_NEW_POST` row when Allan submitted a PENDING post, but the header bell / notification list did not update until a full page reload. Realtime `NotificationAdded` delivery was unreliable on the community `createNotification` path.

## 🔄 Reproduction Steps

1. As community ADMIN, stay on any page with an open WS subscription (logged-in header).
2. As Allan, create a PENDING community post.
3. Watch admin bell / open notification popup without reloading.

**Expected:** Badge and list update immediately via `NOTIFICATION_ADDED` → `NotificationAdded`.
**Actual:** Notification only appeared after reload (DB write succeeded).

## ✅ Fix

- `createNotification` (community path): always persist `type` as a list; normalize payload with `toSubscriptionNotification` before publish; `await pubsub.publish`; do not let presentation/`bumpVersion` failures block publish; treat missing channels as IN_APP for `hasInApp`.
- `createNotificationWithSettings`: same list normalization + `hasInApp` before publish.
- FE `useGetNotificationCounters` / `useGetNotifications`: handle WS via `onData` so every event updates UI.
- Approve still does not call `notifyNewPost` (BUG-125).

## 📁 Files Changed

- `ssl-be/src/modules/notification/notification.controller.ts`
- `ssl-be/src/modules/notification/notification.util.ts`
- `ssl-be/src/modules/notification/notification.util.test.ts`
- `ssl-be/src/modules/notification/notification.controller.create.test.ts`
- `ssl-fe-user/src/modules/notification/notification.hook.ts`

## Related

- [BUG-125](BUG-125-pending-post-admin-notification-timing.md)
- Knowledge item: [pending-post-notification-ws-publish](file:///Users/daniel/.gemini/antigravity-ide/knowledge/pending-post-notification-ws-publish/)
