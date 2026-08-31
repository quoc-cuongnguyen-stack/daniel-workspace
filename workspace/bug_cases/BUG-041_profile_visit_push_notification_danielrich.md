# BUG-041: Profile Visit Push Notification Omitted Due to Missing Web Push Subscription

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-05
> **Date Fixed:** 2026-08-05
> **Project:** SSL
> **Severity:** 🟢 Low

---

## 🔍 Description

When `daniel123` views the profile of `danielrich`, an in-app `PROFILE_VISIT` notification is created, but no push notification is dispatched. Investigation was performed to determine why push notifications fail for `danielrich` despite `pushNotification: true` being enabled in user settings.

## 🔄 Reproduction Steps

1. User `danielrich` registered/created profile (`settings.notification.pushNotification` default `true`).
2. User `daniel123` visits profile of `danielrich`.
3. Backend triggers `notificationCtr.createNotificationWithSettings`.

**Expected behavior:** Push notification is dispatched if push notifications are enabled.
**Actual behavior:** Notification is created with `channels: ["IN_APP"]` only. No push notification is sent.

## 📸 Evidence

```json
=== USER DETAILS ===
Host (danielrich): {
  id: "861b62a2-8c7c-4452-8067-f0ae80a85001",
  username: "danielrich",
  pushSetting: true
}

=== NOTIFICATIONS FOR HOST ===
Notifications: [
  {
    id: "f15bf311-24eb-490c-b2e0-e907dfadd26e",
    type: ["PROFILE_VISIT"],
    channels: ["IN_APP"],
    status: "SENT",
    actorId: "fbe5ff55-8d18-48d6-b84e-b5b052ab7cea"
  }
]

=== PUSH SUBSCRIPTIONS FOR HOST ===
Push subscriptions count: 0
Push subscriptions: []
```

## 🔭 Tracing Evidence

**Jaeger Traces Analyzed:**
- Operations `mongoose.ProfileVisit.find`, `mongoose.User.findOne`, `mongodb.find`, `mongodb.update` traced during profile visit request.
- Database queries confirmed `ProfileVisit` record creation and `NotificationModel` insertion.

## 🧠 Root Cause Analysis

In [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts#L1204-L1211), push channel resolution checks whether active push subscriptions exist for the target user:

```ts
const hasPushSub = await WebPushSubscriptionModel.exists({
    $or: [
        { userId: recipientUser.id },
        { userId: String(recipientUser._id) },
    ],
}).exec().catch(() => null);

if (hasPushSub && s.pushNotification) {
    if (has(E_NotificationType.PROFILE_VISIT)) {
        channelSet.add(E_NotificationChannel.PUSH);
    }
}
```

Because `danielrich` has `0` registered web push subscriptions in `WebPushSubscriptionModel` (`hasPushSub` is `null`/`false`), `channelSet.add(E_NotificationChannel.PUSH)` is skipped. The notification is created with `channels: ["IN_APP"]` only, and push notification dispatch is not attempted.

**Related files:**
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts#L1204-L1211)
- [profile-visit.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/profile-visit/profile-visit.controller.ts#L297-L313)

## 🔧 Fix / Resolution

No code bug found in backend notification logic. The system is operating strictly as designed:
1. `pushNotification` setting in `user.settings.notification` is ON (`true`).
2. Web push delivery requires a device/browser push subscription endpoint stored in `WebPushSubscriptionModel`.
3. Since `danielrich` has not yet logged in from a browser to grant push permissions for the current account ID, no subscription exists in `WebPushSubscriptionModel`.
4. Once `danielrich` logs in and grants browser notification permission, a record is added to `WebPushSubscriptionModel` and push notifications will automatically resume.

## 📝 Lessons Learned

- Always check both `user.settings.notification.pushNotification` and `WebPushSubscriptionModel` when debugging push notification delivery.
- `hasPushSub` optimization intentionally prevents queuing push delivery tasks when no target push endpoint exists.

## 🔗 References

- Knowledge item: `profile-visit-push-subscription-missing`
