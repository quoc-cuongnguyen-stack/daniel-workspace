# BUG-109: next build fails on apollo-cache CacheObject.id

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-25
> **Date Fixed:** 2026-08-25
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

`next build` for ssl-fe-user failed TypeScript checking in `apollo-cache.ts`. `hasCacheId` read `record.id` and `record.__ref` on `Record<string, unknown>`, and `noPropertyAccessFromIndexSignature` requires bracket access for those keys.

## Reproduction steps

1. Open ssl-fe-user after the Apollo nested-merge type policies landed.
2. Run `pnpm build` (or `next build`).

**Expected behavior:** Build typecheck passes.
**Actual behavior:** Worker exits with `Property 'id' comes from an index signature, so it must be accessed with ['id']`.

## Evidence

```
./src/shared/graphql/apollo-cache.ts:8:26
Type error: Property 'id' comes from an index signature, so it must be accessed with ['id'].
```

## Tracing evidence

Jaeger was not required. This is a frontend compile error. No backend span failed.

## PostHog evidence

Not applicable. The failure is local `next build` typecheck.

## Root cause analysis

`CacheObject` was `Record<string, unknown>`. Under `noPropertyAccessFromIndexSignature`, every key on that type is an index signature member, so dotted `record.id` is illegal. Runtime behavior was fine; only the typecheck failed.

**Related files:**
- [apollo-cache.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/apollo-cache.ts)

## Fix applied

Give `CacheObject` optional `id` and `__ref` fields instead of a string index signature so dotted access is legal and `hasCacheId` still recognizes Apollo entities and refs. Accept `unknown` in `applyApolloTypePolicies` so `client.cache` (typed as `ApolloCache`, which omits `policies`) does not need an overlapping cast.

## Unit / regression test

- **Test File:** [apollo-cache.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/apollo-cache.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit -- src/shared/graphql/apollo-cache.test.unit.ts`
- **Test Results:** Slim gallery writes without `id` still keep the cached gallery entity after `applyApolloTypePolicies`.

## Lessons learned

Do not type Apollo cache objects as `Record<string, unknown>` if the code uses dotted field access. Name the fields the merge helper actually reads.

## References

- Related bug cases: BUG-108
