# BUG-009: Announcement Hard Delete and Stale Cache Issues

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-22
> **Date Fixed:** 2026-07-22
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When users interacted with announcements in "My Announcements", three interrelated bugs were present:
1. Clicking "Remove" on an active announcement soft-deleted the item (`updateEvent({ isDel: true })`), moving it into the "Expired" tab instead of permanently deleting it.
2. After deleting an announcement, navigating back to the dashboard still showed the deleted announcement because `awaitRefetchQueries` was `false` and refetching ran asynchronously.
3. Refreshing/reloading the page after deleting an announcement resulted in errors due to stale Apollo GraphQL cache entries for `getMyAnnouncements`.

## 🔄 Reproduction Steps

1. Go to "My Announcements" page (`/announcement`).
2. Click "Remove" on an active announcement card.
3. Observe announcement moving to the "Expired" tab rather than being deleted completely.
4. Navigate to dashboard or reload page → stale announcement data or rendering error occurs.

**Expected behavior:**
- Clicking "Remove" hard-deletes the announcement permanently via `deleteEvent`.
- The dashboard immediately updates without showing deleted announcements.
- Page reloads operate cleanly without stale cache errors.

**Actual behavior:**
- "Remove" performed soft-delete (`isDel: true`).
- UI did not wait for refetch queries, leading to stale data display.
- Stale Apollo cache entries persisted on reload.

## 🧠 Root Cause Analysis

1. `my-announcements.tsx` `handleRemove` was calling `updateEvent({ id }, { isDel: true })` instead of `deleteEvent({ id })`.
2. `useDeleteEvent` in `event.hook.ts` set `awaitRefetchQueries: false`, allowing component handlers to resolve before Apollo refetched active queries.
3. `useDeleteEvent` cache update callback did not explicitly evict `getMyAnnouncements` and run `cache.gc()`.

**Related files:**
- [my-announcements.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/event/component/my-announcements.tsx)
- [event.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/event/event.hook.ts)

// location.hook.ts
1. Added `event?.isDel === true` check in `normalizeEventViewportLocation` to ensure soft-deleted events are never rendered as viewport cards.
2. Updated `useGetLocationsInViewportEvent` and `useGetLocationsInViewportMap` to only fall back to `previousData` when `loading` is `true`, preventing evicted cache states from serving stale `previousData` cards.


## 🧪 Unit / Regression Test

- Ran `pnpm eslint src/modules/event/component/my-announcements.tsx src/modules/event/event.hook.ts --fix` with 0 errors.

## 📝 Lessons Learned

- User "Remove" action on active user resources must perform a hard delete when the product design dictates immediate destruction rather than archiving.
- Mutations that trigger query refetches required for UI consistency must set `awaitRefetchQueries: true` when callers `await refetch()` or rely on synchronous data consistency.
- Cache invalidations in Apollo must eagerly evict related query fields (`getMyAnnouncements`) alongside GC.
