# BUG-035: Notification Delete All Error Toast & Message Notification Infinite Loading

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-04
> **Date Fixed:** 2026-08-04
> **Project:** SSL (ssl-fe-user & ssl-be)
> **Severity:** 🟠 High

---

## 🔍 Description

1. **Delete All Error Toast**: Clicking "Delete all" in the Notification panel (bell icon) showed a red error toast (`Filter.id is required`) even though deleting individual notification items worked without error.
2. **Message Notification Infinite Loading**: Clicking the Message icon (mail icon) displayed "Loading more notifications..." permanently and failed to append subsequent pages of notifications when scrolling.

## 🔄 Reproduction Steps

1. Log in to the application and open the notification panel (bell icon).
2. Click "Delete All" -> confirm deletion -> red error toast appears.
3. Open the message notification panel (mail icon) with >10 notifications -> scroll to bottom -> "Loading more notifications..." spinner stays stuck on screen indefinitely.

**Expected behavior:**
- "Delete All" clears notifications smoothly without throwing error toasts.
- Scrolling in the message notification list loads next pages and hides the loading spinner when all notifications are fetched.

**Actual behavior:**
- Error toast popped up on "Delete All".
- "Loading more notifications..." stayed permanently visible.

## 🧠 Root Cause Analysis

1. **Delete All Error Toast**:
   - `handleDeleteAll` in `notification.page.tsx` called `deleteAllNotifications({ id: notification.id })` for each notification AND issued a final bulk `deleteAllNotifications(type ? { type: [type] } : {})` call.
   - `useDeleteAllNotifications` invoked `DeleteNotificationDocument` (single item deletion `deleteNotification(filter)` in GraphQL).
   - Backend `deleteNotification` controller required `filter.id` and threw `Filter.id is required` (HTTP 400) when called without an `id`.
   - Apollo's `onError` callback triggered `toastError(...)`.

2. **Message Notification Infinite Loading**:
   - `useGetNotifications` set `fetchPolicy: 'no-cache'`.
   - In Apollo Client, `fetchPolicy: 'no-cache'` bypasses `InMemoryCache`. When `fetchMore` ran with `updateQuery` during infinite scroll, Apollo had no cache entry to update.
   - `useQuery`'s `data` state never updated (`notifications` stayed capped at page 1, `page` stayed `1`, `hasNextPage` stayed `true`).
   - `InfiniteScroll` rendered `loader` ("Loading more notifications...") continuously while `hasNextPage` remained `true`.

## 🔧 Fix Applied

1. **Backend (`ssl-be`)**:
   - `ssl-be/src/modules/notification/notification.graphql`: Updated `deleteNotifications` signature to `deleteNotifications(filter: Input_QueryNotification): T_Response_Notification!`.

2. **Frontend (`ssl-fe-user`)**:
   - `ssl-fe-user/src/modules/notification/notification.graphql`: Added `DeleteNotifications` mutation operation.
   - `ssl-fe-user/src/modules/notification/notification.hook.ts`:
     - Updated `useDeleteAllNotifications` to call `DeleteNotificationsDocument` instead of `DeleteNotificationDocument`.
     - Updated `useGetNotifications` `fetchPolicy` from `'no-cache'` to `'network-only'`.
   - `ssl-fe-user/src/modules/notification/notification.page.tsx`:
     - Simplified `handleDeleteAll` to call `deleteAllNotifications(type ? { type: [type] } : undefined)` directly.
     - Updated `useEffect` state sync to merge paginated items by unique `id` without overwriting existing state.
     - Converted pagination mode from automatic scroll (InfiniteScroll) to interactive "Click to load" button ("Loading more notifications...") per user request.

## 🧪 Unit / Regression Test

- Run `pnpm lint` in `ssl-fe-user` & `ssl-be`: PASS
- Run `pnpm test:unit` in `ssl-fe-user`: 15/15 files passed (90/90 tests)
