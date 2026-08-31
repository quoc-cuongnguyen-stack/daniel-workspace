# BUG-008: New Private Chat Message Omitted PUSH Notification Channel

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-21
> **Date Fixed:** 2026-07-21
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## 🔍 Description

When a user sent a new private chat message, the background notification dispatch payload specified `channels: [E_NotificationChannel.IN_APP, E_NotificationChannel.EMAIL]`, omitting `E_NotificationChannel.PUSH`. Consequently, push notifications were not sent for new private messages.

## 🔄 Reproduction Steps

1. User A sends a private message to User B.
2. `conversation.controller.ts` calls `createConversationNotificationInBackground` with `channels: [E_NotificationChannel.IN_APP, E_NotificationChannel.EMAIL]`.
3. Notification channel resolution bypassed `E_NotificationChannel.PUSH`.

**Expected behavior:** Private chat messages dispatch Web Push notifications if recipient has valid push subscriptions and settings enabled.
**Actual behavior:** Push notifications were skipped due to explicit channel filter omitting `PUSH`.

## 🧠 Root Cause Analysis

In [conversation.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/conversation/conversation/conversation.controller.ts#L2592), the channels array hardcoded `[E_NotificationChannel.IN_APP, E_NotificationChannel.EMAIL]`, ignoring the push channel for `NEW_MESSAGE`.

## 🔧 Fix Applied

Updated `createConversationNotificationInBackground` payload in [conversation.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/conversation/conversation/conversation.controller.ts#L2592) to include `E_NotificationChannel.PUSH`.

```diff
- channels: [E_NotificationChannel.IN_APP, E_NotificationChannel.EMAIL],
+ channels: [E_NotificationChannel.IN_APP, E_NotificationChannel.EMAIL, E_NotificationChannel.PUSH],
```

## 🧪 Verification

- **TypeScript Compilation:** `pnpm tsc --noEmit` passed cleanly.
- **Linter:** `pnpm eslint ... --fix` passed.
- **Unit Tests:** `pnpm test:unit` 120/120 passed.
