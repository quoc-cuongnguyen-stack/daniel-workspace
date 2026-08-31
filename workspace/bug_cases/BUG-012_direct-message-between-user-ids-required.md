# BUG-012: DirectMessageBetween GraphQL Error "User IDs are required"

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-22
> **Date Fixed:** 2026-07-22
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟡 Medium

---

## 🔍 Description

When navigating or viewing a user profile, Apollo Client fired the `DirectMessageBetween` GraphQL query with an empty `userId` parameter (`""`), causing the backend to throw a 400 Bad Request GraphQL error `DirectMessageBetween: User IDs are required`.

## 🔄 Reproduction Steps

1. Log into `ssl-fe-user`.
2. View own profile header or navigate to a user profile page before profile data has hydrated.
3. Observe console error: `[browser] error [GraphQL error] DirectMessageBetween: User IDs are required`.

**Expected behavior:** `DirectMessageBetween` GraphQL query should be skipped if `userId` is missing or empty (`""`).
**Actual behavior:** Apollo Client executed the GraphQL query with `userId: ""`, causing backend 400 Bad Request error.

## 📸 Evidence

```
[browser] error [GraphQL error] DirectMessageBetween: User IDs are required, Location: [
    {
        "line": 2,
        "column": 3
    }
], Path: directMessageBetween 
    at Array.forEach (<anonymous>) (<anonymous>)
[browser] Apollo Error: CombinedGraphQLErrors: User IDs are required (src/shared/layout/wrapper.tsx:78:17)
```

## 🔭 Tracing Evidence

**Jaeger Trace Operation:**
`graphql.resolve directMessageBetween` (Duration: ~86ms, Tags: `error=true`)

## 📊 PostHog Evidence

N/A (Local development environment error toast).

## 🧠 Root Cause Analysis

In `src/modules/conversation/message/message.hook.ts`, the custom hook `useDirectMessageBetween(userId: string, skip: boolean)` passed `skip` directly to `useQuery`.
When `ProfileHeader` called `useDirectMessageBetween(!isOwnProfile ? (user?.id ?? '') : '', !auth?.isLoggedIn)`, when `isOwnProfile` was true or `user?.id` was undefined, `userId` evaluated to `""`, while `skip` evaluated to `false`.
This caused Apollo Client to issue `directMessageBetween(userId: "")`, which triggered backend validation `participantCtr.directMessageBetweenUsers` to throw `User IDs are required`.

**Related files:**
- [message.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/message/message.hook.ts)
- [profile-header.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/(components)/profile-header.tsx)
- [participant.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/conversation/participant/participant.controller.ts)

## 🔧 Fix Applied

1. In [message.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/message/message.hook.ts), updated `useDirectMessageBetween` options to set `skip: skip || !userId`.
2. In [profile-header.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/(components)/profile-header.tsx), updated `useDirectMessageBetween` call to pass `targetUserId = !isOwnProfile ? (user?.id ?? '') : ''` and set `skip: !auth?.isLoggedIn || !targetUserId`.

```diff
 export function useDirectMessageBetween(userId: string, skip: boolean) {
     const { data, loading, refetch, fetchMore } = useQuery<
         DirectMessageBetweenQuery,
         DirectMessageBetweenQueryVariables
     >(DirectMessageBetweenDocument, {
         variables: {
             userId,
         },
-        skip,
+        skip: skip || !userId,
     });
```

## 🧪 Unit / Regression Test

- **Test File:** [message.hook.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/message/message.hook.test.unit.ts)
- **Command:** `pnpm test:unit src/modules/conversation/message/message.hook.test.unit.ts`
- **Test Results:** 3 tests passed asserting `useDirectMessageBetween` skips execution when `userId` is empty or `skip` is true, and executes when valid `userId` is provided.

## 📝 Lessons Learned

- Always include falsy/empty ID checks (`!userId`) in Apollo `skip` conditions for queries that require non-empty ID arguments.

## 🔗 References

- Knowledge items: `direct-message-between-user-ids-required`
