# BUG-039: Web Push Notification Title Label Update & Default ON State for New Users (C-356)

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-05
> **Date Fixed:** 2026-08-05
> **Project:** SSL (ssl-be & ssl-fe-user)
> **Severity:** 🟠 High

---

## 🔍 Description

Superthread task C-356 required two key updates for Web Push Notifications:
1. Update the setting section label in Notification Settings to `"App Push Notifications – ON/OFF"`.
2. Ensure that for brand new user accounts, the App Push Notifications setting defaults to **ON** (`pushNotification: true`) upon account creation and when visiting Notification Settings, while strictly preserving existing user settings where users have manually toggled it **OFF**.

## 🔄 Reproduction Steps

1. Create a brand new user account and open Notification Settings.
2. Observe that Push Notifications setting previously lacked a dedicated database user setting `pushNotification`, rendering the switch as OFF (`false`) when untoggled on a fresh device.
3. Observe that section header text displayed `"Browser Push Notifications"` instead of `"App Push Notifications – ON/OFF"`.

**Expected behavior:**
- The setting section header is titled `"App Push Notifications – ON/OFF"`.
- New user accounts have `pushNotification: true` by default.
- Existing user accounts with `pushNotification: false` maintain their OFF state without auto-overwriting.

**Actual behavior:**
- Label was `"Browser Push Notifications"`.
- App Push Notifications toggle was OFF for new users because browser WebPushSubscription status was used directly without user notification setting defaults.

## 🧠 Root Cause Analysis

1. `I_UserSettings_Notification` schema in `user.type.ts`, `user.model.ts`, `user.graphql`, and `user.field-map.ts` lacked a dedicated `pushNotification` boolean preference property.
2. When new users were created in `user.controller.ts`, `pushNotification` was not included in `finalSettings.notification`.
3. In `notification-setting.page.tsx`, `deriveSettings` initialized settings without tracking `pushNotification`, relying solely on `isSubscribed` from browser Web Push API state, which starts as `false` on new browser sessions.

## 🔧 Fix Applied

1. **Backend (`ssl-be`)**:
   - Added `pushNotification?: boolean` to `I_UserSettings_Notification` in `user.type.ts`.
   - Added `pushNotification: { type: Boolean, default: true }` to `UserSettingsNotificationSchema` in `user.model.ts`.
   - Added `pushNotification: Boolean` to `T_UserSettings_Notification` and `Input_UserSettings_Notification` in `user.graphql`.
   - Added `pushNotification` to `user.field-map.ts`.
   - Updated `createUser` in `user.controller.ts` to default `pushNotification` to `true` if undefined.
   - Updated `createNotificationWithSettings` in `notification.controller.ts` to evaluate `s.pushNotification !== false` before adding `E_NotificationChannel.PUSH`.

2. **Frontend (`ssl-fe-user`)**:
   - Updated `"push-title"` in `en.json` to `"App Push Notifications – ON/OFF"`.
   - Added `pushNotification` to `F_UserSettings_Notification` fragment in `user.fragment.graphql`.
   - Updated `deriveSettings` in `notification-setting.page.tsx` to default `pushNotification` to `true`.
   - Updated Switch `checked` state to reflect `(notificationSettings as any).pushNotification !== false && permission !== 'denied'`.
   - Added auto-subscribe effect for granted browser permissions when `pushNotification` setting is enabled.

## 🧪 Unit / Regression Test

- **Test Files:**
  - `ssl-fe-user/src/modules/notification/push-notification.hook.test.unit.ts`
  - `ssl-be/src/modules/user/user.controller.test.ts`
- **Command:** `pnpm test:unit` in `ssl-be` and `ssl-fe-user`
- **Test Results:**
  - Verified `deriveSettings` defaults `pushNotification` to `true` for `undefined` / `null` sources.
  - Verified `deriveSettings` preserves `pushNotification: false` when explicitly set to `false`.
  - All 29 unit test files (126 tests) passed in `ssl-be`.
  - All frontend unit tests passed.

## 🔗 References

- Superthread task: C-356
- Related bug cases: BUG-018, BUG-032
