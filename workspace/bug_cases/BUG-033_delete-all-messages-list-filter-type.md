# BUG-033: Messages List "Delete All" Failed Due to Omitted Notification Type Filter

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-03
> **Date Fixed:** 2026-08-03
> **Project:** SSL Frontend (`ssl-fe-user`) & Backend (`ssl-be`)
> **Severity:** 🟠 High

---

## 🔍 Description

Clicking "Delete all" in the Messages modal (`/en/message`) failed to delete message notifications. The messages remained visible in the list and in MongoDB.

## 🔄 Reproduction Steps

1. Receive chat / message notifications (`E_NotificationType.NEW_MESSAGE`).
2. Open Messages modal (`/en/message`).
3. Click "Delete all" and confirm deletion.
4. Observe that message notifications were not deleted from the list or backend.

**Expected behavior:** All messages in the Messages modal should be deleted.
**Actual behavior:** Nothing was deleted because backend defaulted missing `type` filters to `OTHER_TYPES` (which excludes `NEW_MESSAGE`).

## 🧠 Root Cause Analysis

1. In `notification.page.tsx`, `handleDeleteAll` called `deleteAllNotifications({ id: notification.id })` without passing `type`.
2. In `ssl-be` (`notification.controller.ts`), when `deleteNotifications` received a filter where `type` was `undefined`, it executed `deleteFilter['type'] = { $in: OTHER_TYPES }`.
3. Because `NEW_MESSAGE` is not included in `OTHER_TYPES`, `deleteMany` matched 0 documents in MongoDB when attempting to delete message notifications by ID or bulk.

**Related files:**
- [notification.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.page.tsx)
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)

## 🔧 Fix Applied

1. Updated `ssl-be/src/modules/notification/notification.controller.ts`: When `filter.id` is present or explicit `type` is passed, `deleteNotifications` respects the target `id`/`type` without overriding with `OTHER_TYPES`.
2. Updated `ssl-fe-user/src/modules/notification/notification.page.tsx`: Updated `handleDeleteAll` to pass `type` (`E_NotificationType.NEW_MESSAGE` for Messages tab) in `deleteAllNotifications` calls and execute bulk deletion.

## 🧪 Unit / Regression Test

- `pnpm lint` passed with 0 errors in `ssl-fe-user`.
