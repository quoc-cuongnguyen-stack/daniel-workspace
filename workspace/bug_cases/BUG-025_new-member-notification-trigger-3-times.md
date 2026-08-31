# BUG-025: Duplicate New Member Area Notifications Triggering 3 Times

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-29
> **Date Fixed:** 2026-07-29
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

When new users registered or updated their location, nearby members in their area of interest received 3 duplicate "There is a new member: [username]" notifications.

## 🔄 Reproduction Steps

1. A new user completes registration or updates profile location in `updateUser`.
2. Nearby members in the area check their notification list.

**Expected behavior:** Nearby members receive exactly 1 "There is a new member: [username]" notification.
**Actual behavior:** Nearby members received 3 identical notifications (e.g. `naughtycouple224` x3, `Kate_1` x3).

## 📸 Evidence

User screenshot showed notifications list with identical "There is a new member: naughtycouple224 about 3 hours ago" x3 and "There is a new member: Kate_1 about 5 hours ago" x3.

## 🧠 Root Cause Analysis

1. **Multiple Trigger Statements in `updateUser` (`user.controller.ts`)**:
   `updateUser` evaluated 3 separate `if` blocks sequentially:
   - `intendsToCompleteRegistration && registerStep === COMPLETE`
   - `tempLocationUpdated && settings.temporaryLocation`
   - `partner1LocationUpdated && partner1.locationId`
   When an onboarding update request completes registration and updates location in one payload, all 3 `if` blocks triggered `setImmediate(() => broadcastNewMemberInArea(...))` concurrently.

2. **Absence of Deduplication / Lock Guard**:
   Neither `broadcastNewMemberInArea` nor `createNotificationWithSettings` checked if a notification of type `NEW_MEMBER_IN_YOUR_AREA_OF_INTEREST` for the same `actorId` / `targetId` was already sent recently or in-progress.

## 🔧 Fix Applied

1. **Consolidate Broadcast Triggers in `updateUser` (`ssl-be/src/modules/user/user.controller.ts`)**:
   Replaced 3 separate `setImmediate` calls with a single `shouldBroadcastNewMember` flag. Fired `broadcastNewMemberInArea` at most ONCE per `updateUser` call.

2. **Active Broadcast Lock (`ssl-be/src/modules/user/user.util.ts`)**:
   Added `activeBroadcastLocks` set to skip concurrent broadcast runs for the exact same `newUserId`.

3. **Notification Cooldown Deduplication (`ssl-be/src/modules/notification/notification.controller.ts`)**:
   Added a 1-hour deduplication check in `createNotificationWithSettings` using `NotificationModel.exists`. If a `NEW_MEMBER_IN_YOUR_AREA_OF_INTEREST` notification from `actorId` to `targetId` already exists within 1 hour, it skips creation.

## 🧪 Unit / Regression Test

- **Test File:** [broadcast-new-member-dedup.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/broadcast-new-member-dedup.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/user/broadcast-new-member-dedup.test.ts`
- **Test Results:** 1 passed (1 test). Verified concurrent broadcast calls for the same user ID are deduplicated.
