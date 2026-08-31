# BUG-019: Profile Visit Real-Time Subscription & Eye Icon Counter Not Updating

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-28
> **Date Fixed:** 2026-07-28
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When a user views another user's profile, the recipient's header eye icon (unread profile visits counter) did not update in real time. The counter only updated upon page reload, when switching visibility, or after a 5-second polling interval elapsed.

## 🔄 Reproduction Steps

1. User A visits User B's profile page.
2. `recordProfileVisit` mutation is sent to the backend.
3. User B is currently logged in with an active browser window.
4. **Expected behavior:** User B's eye icon unread counter increments in real time via WebSocket subscription.
5. **Actual behavior:** User B's eye icon count does not update in real time.

## 🧠 Root Cause Analysis

1. **Backend Gap**:
   - In [profile-visit.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/profile-visit/profile-visit.controller.ts#L185-L273), `recordProfileVisit` saved/updated the `ProfileVisitModel` record.
   - Although the JSDoc explicitly noted `"A new or resurfaced visit fires a PROFILE_VISIT notification to the host"`, `recordProfileVisit` omitted calling `notificationCtr.createNotificationWithSettings`.
   - As a result, no `PROFILE_VISIT` notification was saved, and no `NOTIFICATION_ADDED` PubSub event was published over GraphQL WebSocket subscriptions.

2. **Frontend Gap**:
   - In [visitor.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/visitor/visitor.hook.ts), `useGetProfileVisitCounter` relied on a 5-second polling interval and window event listeners, but did not subscribe to `NotificationAddedDocument`.
   - In [notification.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.hook.ts), `useGetNotificationCounters` received WebSocket notifications via `NotificationAddedDocument`, but did not notify the profile visit counter when `PROFILE_VISIT` notifications arrived.

## 🔧 Fix Applied

1. **Backend ([profile-visit.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/profile-visit/profile-visit.controller.ts))**:
   - Updated `recordProfileVisit` to invoke `notificationCtr.createNotificationWithSettings` whenever a profile visit is recorded:
     ```ts
     if (visitResult.success && visitResult.result) {
         void notificationCtr.createNotificationWithSettings(context, {
             doc: {
                 targetId: hostId,
                 actorId: currentUser.id,
                 type: [E_NotificationType.PROFILE_VISIT],
                 entityType: E_NotificationEntityType.USER,
                 entityId: hostId,
             },
         }).catch((err) => {
             log.error('[ProfileVisit] Failed to create PROFILE_VISIT notification', {
                 err,
                 hostId,
                 visitorId: currentUser.id,
             });
         });
     }
     ```

2. **Frontend ([visitor.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/visitor/visitor.hook.ts))**:
   - Added `NotificationAddedDocument` WebSocket subscription inside `useGetProfileVisitCounter` to trigger `refetch()` instantly upon receiving a `PROFILE_VISIT` notification.
   - Exported `notifyProfileVisitCounterChanged`.

3. **Frontend ([notification.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.hook.ts))**:
   - In `useGetNotificationCounters`, added a check for `isProfileVisit` on `notificationAddedData` to call `notifyProfileVisitCounterChanged()`.

## 🧪 Unit / Regression Test

- **Test File:** [profile-visit.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/profile-visit/profile-visit.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/profile-visit/profile-visit.controller.test.ts`
- **Test Results:** Asserted `recordProfileVisit` calls `createNotificationWithSettings` with type `[E_NotificationType.PROFILE_VISIT]` and `entityType: E_NotificationEntityType.USER`, and verifies self-visit prevention. Passed (2/2).

## 📝 Lessons Learned

- Always ensure mutations that impact real-time badges or notification counters publish to the GraphQL PubSub system via `notificationCtr.createNotificationWithSettings`.
- Frontend hooks managing real-time counter badges should subscribe to `NotificationAddedDocument` for instant UI updates instead of relying solely on polling.
