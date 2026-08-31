# BUG-021: Profile Visit Counter Polling Continuous API Calls & Double Refetching

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-29
> **Date Fixed:** 2026-07-29
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

The `getProfileVisitCounter` GraphQL query was executing continuous API requests every 5 seconds in the background (and double-triggering on events), causing excessive server load and unneeded network requests even when the user was inactive or no new profile visits occurred.

## 🔄 Reproduction Steps

1. Log into the application and inspect Network tab in browser DevTools.
2. Observe `getProfileVisitCounter` GraphQL requests being sent automatically every 5 seconds.
3. Observe multiple redundant requests firing when WebSocket notifications arrived.

**Expected behavior:** `getProfileVisitCounter` should ONLY execute on initial page mount, upon receiving real-time WebSocket notification events (`PROFILE_VISIT`), or when local actions occur (mark read, delete visit, tab focus).
**Actual behavior:** `useGetProfileVisitCounter` was continuously polling the backend via `pollInterval: 5000` and `fetchPolicy: 'network-only'`, as well as double-subscribing to WebSocket events.

## 🧠 Root Cause Analysis

1. **Continuous Polling (`pollInterval`)**:
   - `useGetProfileVisitCounter` in `visitor.hook.ts` had `pollInterval: 5000` set on `useQuery`.
   - Combined with `fetchPolicy: 'network-only'`, Apollo Client executed queries every 5 seconds automatically.

2. **Double Event Subscription**:
   - `useGetNotificationCounters` (in `header.tsx`) subscribed to `NotificationAddedDocument` and called `notifyProfileVisitCounterChanged()` on `PROFILE_VISIT` notifications.
   - `useGetProfileVisitCounter` ALSO directly subscribed to `NotificationAddedDocument` AND listened to `PROFILE_VISIT_COUNTER_EVENT`.
   - When a `PROFILE_VISIT` WebSocket notification arrived, both subscriptions triggered, causing `refetch()` to run twice.

3. **String `refetchQueries`**:
   - Mutations (`useMarkProfileVisitRead`, `useDeleteProfileVisit`, `useRecordProfileVisit`) used string query names (`refetchQueries: ['GetProfileVisitCounter']`), which duplicated refetch calls alongside `notifyProfileVisitCounterChanged()`.

## 🔧 Fix Applied

1. **Removed Polling & Subscription Duplication ([visitor.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/visitor/visitor.hook.ts))**:
   - Removed `PROFILE_VISIT_COUNTER_POLL_INTERVAL` and `pollInterval: 5000` option from `useGetProfileVisitCounter`.
   - Set `fetchPolicy: 'cache-and-network'`.
   - Removed direct `useSubscription(NotificationAddedDocument)` inside `useGetProfileVisitCounter` to rely on the centralized `notifyProfileVisitCounterChanged()` event bus.

2. **Cleaned Mutation Refetches ([visitor.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/visitor/visitor.hook.ts))**:
   - Replaced string query refetches with `DocumentNode` reference (`GetProfileVisitsDocument`) where needed, and eliminated duplicate refetch queries on mutations that already fire `notifyProfileVisitCounterChanged()`.

3. **Unit Test ([visitor.hook.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/visitor/visitor.hook.test.unit.ts))**:
   - Added unit test asserting `notifyProfileVisitCounterChanged` dispatches the custom event `ssl:profile-visit-counter-changed`.

## 🧪 Unit / Regression Test

- **Test File:** [visitor.hook.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/visitor/visitor.hook.test.unit.ts)
- **Command:** `pnpm test:unit src/modules/visitor/visitor.hook.test.unit.ts`
- **Result:** Passed (1/1).

## 📝 Lessons Learned

- Avoid using `pollInterval` on queries when real-time WebSocket subscriptions and window event dispatchers are already configured.
- Consolidate real-time notification subscriptions to a single event handler to prevent double-refetching on WebSocket messages.
