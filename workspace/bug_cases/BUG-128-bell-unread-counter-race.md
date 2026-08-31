# BUG-128: Bell unread badge stayed 0 after realtime COMMUNITY_NEW_POST

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-29
> **Date Fixed:** 2026-08-29
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

After BUG-127, Allan's PENDING community post delivered a realtime notification into the admin Notifications modal (unread blue dot), but the header bell badge did not show `1` until a full page reload.

## 🔄 Reproduction Steps

1. Stay logged in as community ADMIN with the header mounted.
2. As Allan, submit a PENDING post.
3. Open Notifications — item appears; observe bell badge.

**Expected:** Bell shows unread count immediately (no reload).
**Actual:** List updated; badge stayed empty.

## ✅ Fix

- FE: `mergeCountersFromQuery` — first hydrate uses `Math.max` so a stale `GetNotificationCounters` `0` cannot wipe a WS `+1`.
- FE follow-up: after hydrate, track `unackedAddIdsRef` for badge-affecting `NotificationAdded` ids. While unacked count &gt; 0, later query snapshots also use `Math.max` (stale/late absolute `0` cannot wipe). When unacked is empty, trust server absolute (mark-read/delete refetch). Clear unacked when server caught up (`query >= prev`) or on absolute trust; clear `processedIds` only on absolute trust.
- FE: sync `setCounters` on WS/query (no `startTransition` on counter writes).
- BE: `await queryCacheService.bumpVersion('notification')` after `createNotification` publish.
- Approve still does not re-fire `notifyNewPost` (BUG-125). Dedup via `processedIdsRef` unchanged.

## 📁 Files Changed

- `ssl-fe-user/src/modules/notification/notification.counter.ts`
- `ssl-fe-user/src/modules/notification/notification.hook.ts`
- `ssl-fe-user/src/modules/notification/notification.counter.test.unit.ts`
- `ssl-be/src/modules/notification/notification.controller.ts`

## Related

- [BUG-127](BUG-127-pending-post-notification-ws-publish.md)
- [BUG-125](BUG-125-pending-post-admin-notification-timing.md)
- Knowledge item: [bell-unread-counter-race](file:///Users/daniel/.gemini/antigravity-ide/knowledge/bell-unread-counter-race/)
