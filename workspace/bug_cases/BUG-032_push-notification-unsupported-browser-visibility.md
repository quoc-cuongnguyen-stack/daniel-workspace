# BUG-032: Push Notification Setting Hidden on Unsupported Browsers & Devices

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-03
> **Date Fixed:** 2026-08-03
> **Project:** SSL Frontend (`ssl-fe-user`)
> **Severity:** 🟠 High

---

## 🔍 Description

Superthread Task 908 reported that users accessing the platform on certain browsers/devices (e.g. older macOS Safari, non-PWA iOS Safari tabs, embedded WebViews) did not see the push notification toggle option at all in their notification settings modal.

## 🔄 Reproduction Steps

1. Open Notification Settings modal on a browser or environment where `'PushManager' in window` or `'serviceWorker' in navigator` is `false` (e.g. Safari 15 on macOS, standard browser tab in iOS Safari).
2. Observe the Notification Settings modal.

**Expected behavior:** The Push Notification section should be visible with diagnostic information explaining why Web Push is not supported in the current browser/device, along with actionable guidance (such as iOS PWA setup instructions).
**Actual behavior:** The entire Push Notification section was completely omitted from the UI due to a `{isSupported && (...) }` conditional wrapper.

## 📸 Evidence

- Superthread Task 908: `[BUG] - Push messege to APP`
- PostHog Session URL: `https://eu.posthog.com/shared/l6pvVm6mWt4gtwxHpImZRZZC3KkpJw?t=43`

## 🧠 Root Cause Analysis

In `notification-setting.page.tsx`, the Push Notification block was conditionally wrapped inside `{isSupported && (...)}`.
`isSupported` was derived from `usePushNotification()`, which evaluated:
`const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window;`

When `pushSupported` was `false` (due to operating system or browser limitations), `isSupported` was `false`, causing the entire section to disappear silently.

**Related files:**
- [push-notification.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/push-notification.hook.ts)
- [notification-setting.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification-setting.page.tsx)
- [en.json](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/i18n/data/en.json)

## 🔧 Fix Applied

1. Unconditionally rendered the Push Notification section in `notification-setting.page.tsx`.
2. Added an unsupported fallback banner in `notification-setting.page.tsx` when `!isSupported`.
3. Added `isIOS` detection in `push-notification.hook.ts` and rendered specific iOS instructions ("On iOS devices, please tap the Share button in Safari and select 'Add to Home Screen' to enable push notifications").
4. Added translation keys to `en.json`.

## 🧪 Unit / Regression Test

- **Test File:** [push-notification.hook.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/push-notification.hook.test.unit.ts)
- **Command:** `pnpm test src/modules/notification/push-notification.hook.test.unit.ts`
- **Linter Check:** `pnpm lint` passed with zero errors.

## 📝 Lessons Learned

- Never silently hide settings features based on browser support. Always present informative banners so users and support teams understand why a feature is unavailable.

## 🔗 References

- Superthread Task 908
