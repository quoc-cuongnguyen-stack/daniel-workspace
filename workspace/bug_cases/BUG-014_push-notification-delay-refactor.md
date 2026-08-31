# BUG-014: 5s Push Notification & New Member Broadcast Delay

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-22
> **Date Fixed:** 2026-07-22
> **Project:** ssl-be
> **Severity:** 🟠 High

---

## 🔍 Description

Push notifications and new member area broadcasts experienced artificial 5-second delays during user registration completion and message delivery due to conservative Bull queue backoff options, low broadcast concurrency limits, and long sleep delays in location retry loops.

## 🧠 Root Cause Analysis

1. **Queue Exponential Backoff Options**:
   - Both `pushChatQueue` ([push-chat.queue.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/push-chat/push-chat.queue.ts)) and `emailQueue` ([email.constant.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/email/email.constant.ts)) configured default job options with `backoff: { delay: 5000 }` (5000ms delay).
2. **Broadcast Concurrency & Retry Bottlenecks**:
   - `broadcastNewMemberInArea` ([user.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user.util.ts)) used a low concurrency limit (`BROADCAST_CONCURRENCY = 10`), causing sequential chunking to take multiple seconds across active users.
   - Initial location replication retry used a `500ms` `setTimeout` sleep, and failed recipient retries used a `1000ms` `setTimeout` sleep.
3. **Geofence Retry Delays**:
   - `notification.controller.ts` used `300ms` sleep delays in geofence retry loops.

## 🔧 Fix Applied

1. **Reduced Queue Backoff Delays**: Reduced Bull job backoff delays from `5000ms` to `1000ms` in `push-chat.queue.ts` and `email.constant.ts`.
2. **Increased Concurrency**: Increased `BROADCAST_CONCURRENCY` in `user.util.ts` from `10` to `25` (2.5x throughput acceleration).
3. **Reduced Retry Sleep Delays**:
   - Reduced location propagation retry delay in `user.util.ts` from `500ms` to `100ms`.
   - Reduced failed recipient retry delay in `user.util.ts` from `1000ms` to `200ms`.
   - Reduced geofence check retry delays in `notification.controller.ts` from `300ms` to `50ms`.

## 🧪 Unit / Regression Test

- Ran ESLint check across all modified files (`pnpm eslint src/modules/... --fix`).
- Verified zero errors and zero warnings.

## 📝 Lessons Learned

- Avoid hardcoding large multi-second sleep delays (`5000ms` / `1000ms`) in background notification execution pipelines; use smaller sub-second retry intervals and optimal concurrency limits for instant push delivery.
