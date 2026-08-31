# BUG-011: DeleteEvent GraphQL Error & Apollo Refetch Query Warnings

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-22
> **Date Fixed:** 2026-07-22
> **Project:** SSL (Frontend & Backend)
> **Severity:** 🟡 Medium

---

## 🔍 Description

When user removed an announcement in `MyAnnouncements` or when `deleteEvent` mutation was called for an event that was already deleted or not present in the backend database, the backend threw a `400 Bad Request` GraphQL Error `DeleteEvent: Event not found.`. Additionally, Apollo Client emitted console warnings (`Unknown query named "..." requested in refetchQueries`) because string query names were passed in `refetchQueries` array when those queries were not mounted in the DOM.

## 🔄 Reproduction Steps

1. Navigate to `/en/announcement` -> My Announcements.
2. Click "Remove" / "Delete" on an announcement that was previously deleted or soft-deleted on backend.
3. GraphQL Error occurs: `DeleteEvent: Event not found.` logged at `src/modules/event/component/my-announcements.tsx:70`.
4. Console warnings appear: `Unknown query named "GetUserAnnouncements" requested in refetchQueries...`.

**Expected behavior:** `deleteEvent` should be idempotent on backend and refetch queries safely using DocumentNode objects on frontend without throwing console warnings or errors.
**Actual behavior:** Backend returned 400 Bad Request error `Event not found.`, and Apollo Client logged unknown query name warnings.

## 📸 Evidence

```
[browser] error [GraphQL error] DeleteEvent: Event not found., Location: [{ "line": 2, "column": 3 }], Path: deleteEvent
[browser] Apollo Error: CombinedGraphQLErrors: Event not found. (src/shared/layout/wrapper.tsx:78:17)
[browser] Error removing announcement: CombinedGraphQLErrors: Event not found. (src/modules/event/component/my-announcements.tsx:70:21)
[browser] Unknown query named "GetUserAnnouncements" requested in refetchQueries options.include array
```

## 🧠 Root Cause Analysis

1. `ssl-be/src/modules/event/event.controller.ts`: `deleteEvent` called `eventCtr.getEvent(context, { filter })`. If `getEvent` returned `success: false` (event already deleted or missing), `deleteEvent` threw `throwError({ message: 'Event not found.', status: RESPONSE_STATUS.BAD_REQUEST })`, making deletion non-idempotent.
2. `ssl-fe-user/src/modules/event/event.hook.ts`: `useDeleteEvent` and `useUpdateEvent` passed raw string arrays (`['GetUserAnnouncements', ...]`) to `refetchQueries`. Apollo Client warns when string query names do not match active mounted queries in the query store.
3. `ssl-fe-user/next.config.mjs`: Next.js image component used `quality={100}`, which was not present in `images.qualities: [65, 70, 75, 80, 85, 90]`.

## 🔧 Fix Applied

1. **Backend (`ssl-be`)**: In `deleteEvent` controller ([event.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/event/event.controller.ts)), when `!eventFound.success || !eventFound.result`, return `{ success: true, message: 'Event already deleted.', result: null as any }` to make `deleteEvent` idempotent.
2. **Frontend (`ssl-fe-user`)**:
   - Replaced string query names in `refetchQueries` with Apollo DocumentNode objects (`GetUserAnnouncementsDocument`, `GetMyAnnouncementsDocument`, etc.) in [event.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/event/event.hook.ts).
   - Wrapped `handleRemove` and `handleDelete` in [my-announcements.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/event/component/my-announcements.tsx) with a `finally` block executing `await refetch()` to ensure UI state syncs even on error.
   - Added `100` to `images.qualities` in [next.config.mjs](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/next.config.mjs).

## 📝 Lessons Learned

- Mutation handlers should be idempotent whenever possible. Calling `delete` on an entity that is already gone should return success rather than failing with a 400 error.
- Use `DocumentNode` objects instead of raw string names for Apollo Client `refetchQueries` to avoid unmounted query warnings.

## 🔗 References

- Related bug cases: BUG-009
- Knowledge items: `announcement-hard-delete-and-stale-cache`
