# BUG-010: User Map Pin Does Not Revert to Normal Pin on Announcement Deletion

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-22
> **Date Fixed:** 2026-07-22
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When a user deletes their announcement, the event pin clears from the map in real-time, but the user's profile pin on the map remains styled as an event pin (`hasUpcomingEvent: true`) instead of reverting to a normal user pin.

## 🔄 Reproduction Steps

1. User creates an announcement (event). User's map pin updates to event pin style (`hasUpcomingEvent: true`).
2. User goes to "My Announcements" and deletes/removes the announcement.
3. Event pin disappears from the map.
4. User map pin remains as event pin style instead of reverting to a normal user pin.

**Expected behavior:** User map pin reverts to normal pin (`hasUpcomingEvent: false`) after deleting their last announcement.
**Actual behavior:** User map pin retains `hasUpcomingEvent: true` because `deleteEvent` evaluated the deleted event as still active during the aggregate check.

## 🧠 Root Cause Analysis

In `ssl-be/src/modules/event/event.controller.ts`, the `deleteEvent` function checks if the event owner has any other active upcoming events before deleting the document from MongoDB:

```typescript
const aggRes = await mongooseCtr.aggregate([
    { $match: { createdById: ownerId, isActive: true, isDel: { $ne: true }, endDate: { $gt: new Date() } } },
    { $limit: 1 },
]);
```

Because `id: { $ne: eventFound.result.id }` was missing from the `$match` filter, and because `deleteOne` executes AFTER this check, MongoDB matched the event being deleted itself. Thus `aggRes.result.length > 0` evaluated to `true`, erroneously setting `user.hasUpcomingEvent = true`.

## 🔧 Fix Applied

Updated `deleteEvent` in `ssl-be/src/modules/event/event.controller.ts` to explicitly exclude the event currently being deleted:

```typescript
const aggRes = await mongooseCtr.aggregate([
    {
        $match: {
            createdById: ownerId,
            isActive: true,
            isDel: { $ne: true },
            id: { $ne: eventFound.result.id },
            endDate: { $gt: new Date() },
        },
    },
    { $limit: 1 },
]);
```

Additionally, updated `deleteEvents` (batch delete) to recalculate `hasUpcomingEvent` for all impacted user IDs after deletion completes.

## 📝 Lessons Learned

When running MongoDB `aggregate` queries to check for remaining entities in pre-deletion hooks/handlers, always explicitly exclude the target document ID (`id: { $ne: targetId }`) if the deletion operation itself has not yet been committed.
