# BUG-003: Notification Creation Full Collection Scan (2s Delay)

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When a user sends an invitation for a group conversation (or triggers any notification), the system hangs for roughly 2 seconds before completing the request. The long delay is caused by a full collection scan on the `users` collection in MongoDB, originating from the `createNotificationWithSettings` function.

## 🔄 Reproduction Steps

1. A user attempts to send an invitation to another user for a group conversation.
2. The server processes the invitation logic.
3. The server calls `notificationCtr.createNotificationWithSettings` to create an associated notification.
4. The HTTP request blocks for ~2s.

**Expected behavior:** The invitation and notification should be processed in milliseconds.
**Actual behavior:** The request takes roughly 2s due to a full DB scan.

## 🧠 Root Cause Analysis

The delay is caused by an invalid `$or` query filter when fetching the notification recipient's user profile:

```typescript
// ssl-be/src/modules/notification/notification.controller.ts
const tid = String(targetId).trim();
const orFilters: any[] = [{ targetId: tid }, { id: tid }];
if (isValidObjectId(tid)) {
    orFilters.push({ _id: new Types.ObjectId(tid) });
}
const recipientUser = await UserModel.findOne({ $or: orFilters }).lean<I_User>().exec();
```

The property `targetId` does not exist on the `UserModel` (it is a field in `NotificationModel`). Because `targetId` is unindexed in the `users` collection, wrapping it inside an `$or` block forces MongoDB to perform a full collection scan instead of utilizing the fast indexes on `id` and `_id`. 

**Related files:**
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)

## 🔧 Fix Applied

Removed the incorrect `{ targetId: tid }` condition from the `$or` query against the `UserModel`.

```diff
- const orFilters: any[] = [{ targetId: tid }, { id: tid }];
+ const orFilters: any[] = [{ id: tid }];
```

## 📝 Lessons Learned

- Be extremely careful when copy-pasting DB queries between models, especially `$or` queries. A single unindexed field in an `$or` query forces MongoDB to bypass all indexes.
- Unexplainable constant delays (e.g. 2s on every request) are very often caused by missing indexes or full collection scans on large collections.

## 🔗 References

- Knowledge items: [Notification Creation Full Collection Scan (2s Delay)](file:///Users/daniel/.gemini/antigravity-ide/knowledge/notification-creation-full-collection-scan/artifacts/bug_analysis.md)
