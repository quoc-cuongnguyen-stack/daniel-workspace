# BUG-036: Message Notification Badge Counter Mismatch, Client-Side Deduplication & Pagination Issue

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-04
> **Date Fixed:** 2026-08-04
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

The envelope message badge icon in the header returned an unread count of 5, while opening the message notification list displayed only 2 items. Furthermore, clicking "Loading more notifications..." loaded 0 additional visible items and caused the button to disappear.

## 🔄 Reproduction Steps

1. Log into `https://development.secretswingerlust.com/en/dashboard` as `daniel123`.
2. Inspect the envelope icon in the header — unread badge counter shows 5.
3. Click the envelope icon to open the Messages modal — list renders only 2 items.
4. Click "Loading more notifications..." — button disappears, but no new messages appear in the list.

**Expected behavior:** Unread badge counter matches the number of unread conversations (2), and clicking "Loading more notifications..." loads additional conversation pages without silently discarding items.
**Actual behavior:** Unread badge counter counted raw message notifications (5), and client-side deduplication collapsed multiple messages in the same conversation down to 2 items, discarding subsequent pages on scroll.

## 🧠 Root Cause Analysis

1. **Counter Mismatch**: `countConversationUnreadInApp` in `ssl-be/src/modules/notification/notification.controller.ts` counted raw `NEW_MESSAGE` notification records in MongoDB instead of distinct unread conversations (`entityId`).
2. **Pagination Discard**: `getNotifications` in `ssl-be` returned raw paginated notification records. Frontend `visibleNotifications` in `ssl-fe-user/src/modules/notification/notification.page.tsx` deduplicated message notifications by content key, causing all records on page 2 to be discarded as duplicate keys while `hasNextPage` became false.

## 🔧 Fix Applied

1. **Backend (`ssl-be`)**:
   - Updated `countConversationUnreadInApp` in [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts#L99-L130) to count distinct unread conversation `entityId`s using `NotificationModel.distinct('entityId', ...)`.
   - Updated `getNotifications` in [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts#L189-L248) for `NEW_MESSAGE` queries to group by `{ $ifNull: ['$entityId', '$actorId'] }` using MongoDB aggregation.
   - Updated `deleteNotification` and `deleteNotifications` in [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts#L1543-L1635) to protect age verification reminders (`AGE_VERIFICATION_SKIPPED`, `AGE_VERIFICATION_REJECTED`) from deletion for unverified users, and added background auto-restoration (`isDel: false`) in `getNotifications`.
2. **Frontend (`ssl-fe-user`)**:
   - Updated `visibleNotifications` in [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx#L987-L998) to deduplicate message notifications by conversation key (`entityId` or `actorId`).
   - Enhanced `fetchMoreScroll` in [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx#L1091-L1165) to auto-advance pagination if a page is deduplicated away while `hasNextPage` remains true.
   - Added `onDeleteSuccess` callback in `NotificationListItem` and updated `useEffect` list state sync in `NotificationPage` so deleting a notification updates the UI state immediately without requiring a modal close/reopen.
   - Added a synthetic fallback in `pinnedAgeVerificationNotification` so that the age verification prompt remains pinned and automatically restored for unverified users even if the underlying notification record was deleted.

## 🧪 Unit / Regression Test

- **Backend Test:** [notification-counter-dedup.spec.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification-counter-dedup.spec.ts)
  - Asserted `countConversationUnreadInApp` returns distinct unread conversation count.
  - Asserted `getNotifications` for `NEW_MESSAGE` groups results by conversation `entityId`.
  - Command: `pnpm --prefix ssl-be test src/modules/notification/notification-counter-dedup.spec.ts` (Passed).
- **Frontend Test:** [notification-dedup-pagination.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification-dedup-pagination.test.unit.ts)
  - Asserted message notifications are deduplicated per conversation.
  - Command: `pnpm --prefix ssl-fe-user test:unit src/modules/notification/notification-dedup-pagination.test.unit.ts` (Passed).
