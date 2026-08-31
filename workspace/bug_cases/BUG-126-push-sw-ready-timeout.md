# BUG-126: PushNotification ServiceWorker ready timeout

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-29
> **Date Fixed:** 2026-08-29
> **Project:** SSL
> **Severity:** 🟢 Low

---

## Description

Browser console logged:

`[PushNotification] Error checking subscription: Error: ServiceWorker ready timeout`

on cold loads for logged-in users.

## Root cause

`usePushNotification.checkSubscription` raced `navigator.serviceWorker.ready` with a 3s timeout. `ready` only resolves after a service worker is registered and active. AuthProvider registers `/sw.js` asynchronously after login + COMPLETE register step, so the status check often timed out and `console.error`d even when push was simply not registered yet.

## Fix

- Status check uses `getRegistration()` only; missing SW ⇒ `isSubscribed: false` with no error.
- Subscribe path calls `ensurePushServiceWorker()` (register `/sw.js` if needed, then wait for ready with a longer fallback).



## Files

- `ssl-fe-user/src/modules/notification/push-notification.util.ts`
- `ssl-fe-user/src/modules/notification/push-notification.hook.ts`
- `ssl-fe-user/src/modules/notification/push-notification.util.test.unit.ts`

