# BUG-108: Apollo cache drops T_User nested objects on partial writes

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-25
> **Date Fixed:** 2026-08-25
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

The browser console warned that cache data may be lost when replacing `ageVerify`, `partner1`, and `partner2` on a `T_User` object. Slim community/conversation/map queries then overwrote the full nested objects, which can force extra network refetches and wipe partner details (including location) that were already cached.

## Reproduction steps

1. Load a page that writes the full `F_User` fragment (checkAuth / profile).
2. Open a community feed, members list, conversation list, or map pin that writes the same user with only `ageVerify.status` and a slim partner selection.
3. Watch the browser console.

**Expected behavior:** Later partial writes merge into the cached user. Nested age-verify and partner fields stay available without a refetch.
**Actual behavior:** Apollo replaces the whole nested object and logs `Cache data may be lost when replacing the ageVerify/partner1/partner2 field of a T_User object.`

## Evidence

```
Cache data may be lost when replacing the ageVerify field of a T_User object.
  existing: { __typename: 'T_AgeVerify', agreement, approvedById, dateOfBirth, method, preApproval, ... }
  incoming: { __typename: 'T_AgeVerify', status: 'APPROVED' }

Cache data may be lost when replacing the partner1 field of a T_User object.
Cache data may be lost when replacing the partner2 field of a T_User object.
```

Incoming partner objects matched slim author/member selections: `gender`, `dateOfBirth`, `gallery { url }`, `location: null`.

## Tracing evidence

Jaeger was not required. This is an Apollo InMemoryCache merge warning in the user frontend. No backend span failed.

## PostHog evidence

`query-error-tracking-issues-list` for "Cache data may be lost when replacing" over the last 7 days returned no issues. This is a console warning from Apollo Client, not an exception autocapture event.

## Root cause analysis

`T_AgeVerify` and `T_UserPartner` have no GraphQL `id`. Apollo cannot normalize them, so a later write of a subset replaces the cached object.

Slim selections that trigger this include `F_CommunityPostAuthor`, `F_CommunityMember`, conversation list/message/recipient partners, gallery `uploadedBy`, and map pin `entity` user blocks. They ask for `ageVerify { status }` and partner `gallery { url }` without ids.

`@cyberskill/shared` creates `new InMemoryCache()` with no typePolicies. Auth already worked around one symptom: after `createMessage`, a partial sender write can clear `partner1.location`, so `auth.provider` refetches checkAuth.

**Related files:**
- [apollo-cache.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/apollo-cache.ts)
- [wrapper.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/layout/wrapper.tsx)
- [user.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/user/user.graphql)
- [communities-post.fragment.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities-post.fragment.graphql)
- [communities.fragment.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.fragment.graphql)

## Fix applied

Added InMemoryCache typePolicies: `merge: true` on `T_AgeVerify`, `T_PreApproval`, `T_AIVerifyResult`, `T_AgeRange`, and `T_UserPartner`. Partner `gallery` / `location` keep an already-normalized entity when the incoming object has no id. Policies are applied with `addTypePolicies` on the Next.js streaming cache. Do not construct `@apollo/client`'s `InMemoryCache` here (that throws in SSR).

## Unit / regression test

- [apollo-cache.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/apollo-cache.test.unit.ts)
- [apollo-cache.test.e2e.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/apollo-cache.test.e2e.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit` then `pnpm --prefix ssl-fe-user test:e2e`
- **Test results:** Default cache drops method/bio/gallery id after a slim write; the typed cache keeps them.

## Lessons learned

Nested GraphQL types without ids need `merge: true` (or ids) before any query is allowed to select a subset of the same object. Slim list/card fragments on `T_User` are otherwise cache-unsafe.

## References

- Apollo: [merging non-normalized objects](https://go.apollo.dev/c/merging-non-normalized-objects)
- Related workaround: [auth.provider.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/auth/auth.provider.tsx) checkAuth refetch when `partner1.location` is missing
- Knowledge item: [apollo-user-nested-cache-merge](file:///Users/daniel/.gemini/antigravity-ide/knowledge/apollo-user-nested-cache-merge/artifacts/bug_analysis.md)
