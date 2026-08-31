# Bug Case BUG-031: In-House Bell Notification Counter & Unread Soft-Delete/Dismiss Filtering (#902)

## 📌 Summary
- **Bug ID**: BUG-031
- **Task**: Superthread #902
- **Date**: 2026-08-03
- **App**: `ssl-be` & `ssl-fe-user`
- **Severity**: Medium
- **Status**: ✅ Fixed

---

## 🔍 Symptom
1. **Bell Badge Counter Miscalculation (Unread Counter mismatch)**:
   - When notifications were deleted or soft-deleted (`isDel: true`) or auto-dismissed (`status: DISMISSED`), the notification list showed "No notifications yet", but the Bell header badge counter STILL displayed `1` (or unread count).
2. **Notification Deletion Restrictions**:
   - Age verification notifications were restricted from being deleted.

---

## 🛠️ Root Cause
- `countOtherUnreadInApp` in `ssl-be/src/modules/notification/notification.controller.ts` only filtered `status: { $ne: READ }` and `dismissedAt: null`.
- It did **NOT** filter out `isDel: { $ne: true }` (soft-deleted notifications) nor did it filter out `status: DISMISSED` (auto-dismissed notifications for deleted entities/users).
- As a result, when a user deleted notifications, `getNotifications` excluded the deleted/dismissed items (rendering an empty list "No notifications yet"), while `countOtherUnreadInApp` still counted soft-deleted or dismissed documents, keeping the badge counter at `1`.

---

## 🛠️ Resolution

1. **Backend (`ssl-be/src/modules/notification/notification.controller.ts`)**:
   - `countOtherUnreadInApp`: Added `isDel: { $ne: true }` and `status: { $nin: [E_NotificationStatus.READ, E_NotificationStatus.DISMISSED] }`.
   - `countConversationUnreadInApp`: Added `isDel: { $ne: true }` and `status: { $nin: [E_NotificationStatus.READ, E_NotificationStatus.DISMISSED] }`.
   - `deleteNotifications`: Normalized `deleteFilter.type` to ensure deleting from the Bell tab only deletes `OTHER_TYPES` notifications.
   - Updated unit tests in `notification.controller.test.ts`.

2. **Frontend (`ssl-fe-user`)**:
   - Expose deletion capability for all notification items.
   - Render empty state message correctly.

---

## 🧪 Verification
- Backend unit tests (`notification.controller.test.ts`) passed 5/5.
- ESLint passed with 0 errors.
