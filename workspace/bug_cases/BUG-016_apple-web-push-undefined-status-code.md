# BUG-016: Apple Push Service (APNs) WebPush Delivery Error & Stale Subscription Cleanup

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-23
> **Date Fixed:** 2026-07-23
> **Project:** ssl-be
> **Severity:** 🟡 Medium

---

## 🔍 Description

Apple Push Notification Service (`https://web.push.apple.com/...`) failed to send WebPush notifications, throwing an error with `{ statusCode: undefined, message: '' }`. Additionally, because `statusCode` was `undefined`, stale/revoked Apple Push endpoints were not removed from the database and remained stuck in `WebPushSubscriptionModel`.

## 🧠 Root Cause Analysis

1. **Missing APNs VAPID Headers**:
   - Apple Web Push (`web.push.apple.com`) requires HTTP/2 VAPID headers for expiration (`TTL`) and priority (`urgency`).
   - In [web-push.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/web-push/web-push.service.ts), `webpush.sendNotification()` was called without the options argument (`{ TTL: 86400, urgency: 'high' }`).
2. **Stale Subscription Filter**:
   - In [web-push.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/web-push/web-push.controller.ts), the cleanup logic only checked `res.statusCode === 410 || res.statusCode === 404`. When Apple push gateway resets the connection on an expired subscription, `statusCode` is `undefined`, causing the stale record to persist.

## 🔧 Fix Applied

1. Added `{ TTL: 86400, urgency: 'high' }` options to `webpush.sendNotification()` in [web-push.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/web-push/web-push.service.ts#L47-L50).
2. Enhanced error payload extraction in `web-push.service.ts` to inspect `error.body` and `error.code`.
3. Updated stale subscription cleanup in [web-push.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/web-push/web-push.controller.ts#L144-L153) to auto-delete records when `res.statusCode === undefined` or `400 / 404 / 410`.

## 🧪 Unit / Regression Test

- Verified clean ESLint check (`pnpm eslint src/modules/web-push/... --fix`).
- Verified zero errors and zero warnings.

## 📝 Lessons Learned

- Always pass `{ TTL, urgency }` options when invoking `web-push` to satisfy Apple APNs HTTP/2 header requirements.
- Treat network connection drops (`statusCode === undefined`) during WebPush dispatch as stale endpoint signals to prevent database clutter.
