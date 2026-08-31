# BUG-040: Web Push Notification Settings Automatic Override Prevention

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-06
> **Date Fixed:** 2026-08-06
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟠 High

---

## 🔍 Description

When existing users previously turned Web Push Notifications OFF (or unsubscribed), logging in or navigating the app would automatically override their OFF state and re-enable push notifications automatically. The system failed to preserve the OFF state for existing users whose settings in MongoDB did not explicitly contain `pushNotification: false`.

## 🔄 Reproduction Steps

1. Create or log into an existing user account that previously turned push notifications OFF (or unsubscribed).
2. Ensure browser notification permission is `'granted'`.
3. Log in or reload the app.
4. Observe that `PushNotificationAutoSync` and `NotificationSettingPage` evaluated `pushSetting !== false` as `true` (since `pushNotification` in `auth.user.settings.notification` was `undefined`).
5. Observe that the system called `subscribe()`, creating a push subscription on the backend and automatically overriding the user's OFF setting to ON.

**Expected behavior:**
- Existing user OFF state is strictly preserved.
- The system must not auto-subscribe users unless `pushNotification` in user settings is explicitly `true`.

**Actual behavior:**
- `pushSetting !== false` and `deriveSettings` defaulted `undefined` to `true`, triggering `subscribe()` and overriding the user's OFF state to ON.

## 🧠 Root Cause Analysis

1. **`PushNotificationAutoSync` in `auth.provider.tsx`**: Evaluated `pushSetting !== false`. For existing users whose MongoDB `settings.notification` document lacked `pushNotification` (or was `undefined`), `undefined !== false` evaluated to `true`, causing `PushNotificationAutoSync` to auto-subscribe any user with `'granted'` browser permissions.
2. **`deriveSettings` in `notification-setting.page.tsx`**: Evaluated `(source as any)?.pushNotification ?? true`. When `source?.pushNotification` was `undefined`, it returned `true`, causing the auto-subscribe effect in `notification-setting.page.tsx` (`currentPushNotification !== false`) to re-subscribe the user.
3. **Stale `AuthContext` state**: `NotificationSettingPage` did not trigger `checkAuth()` after `updateUser` completed, leaving stale `undefined`/`true` in-memory settings in `AuthContext`.

## 🔧 Fix Applied

1. **`auth.provider.tsx`**:
   - Updated `PushNotificationAutoSync` condition from `pushSetting !== false` to `pushSetting === true`. Auto-sync now strictly requires an explicit `true` setting before registering subscriptions.

2. **`notification-setting.page.tsx`**:
   - Updated `deriveSettings(source, isSubscribed)` to check `typeof rawPush === 'boolean' ? rawPush : (isSubscribed ?? false)`. If `pushNotification` setting is `undefined`, it falls back to `isSubscribed` state (preserving OFF for unsubscribed existing users).
   - Updated auto-subscribe effect to require `currentPushNotification === true`.
   - Updated `handleSave` to call `await checkAuth()` after `updateUser` completes, immediately updating `AuthContext` state.

3. **`push-notification.hook.test.unit.ts`**:
   - Added unit tests for `deriveSettings` and `PushNotificationAutoSync` auto-sync conditions.

## 🧪 Unit / Regression Test

- **Test File:** [push-notification.hook.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/push-notification.hook.test.unit.ts)
- **Command:** `pnpm test:unit` in `ssl-fe-user`
- **Test Results:** All 6 unit tests passed. All 29 backend test files (126 tests) passed in `ssl-be`. All 0 linter errors.

## 📝 Lessons Learned

- Avoid using non-strict inequality (`setting !== false`) for boolean settings when `undefined` represents an unconfigured or legacy state; use explicit `setting === true`.
- Always check active entity states (like `isSubscribed`) when deriving fallback values for missing schema fields in legacy records.

## 🔗 References

- Related bug cases: BUG-039
- Knowledge items: `push-notification-auto-override-prevention`
