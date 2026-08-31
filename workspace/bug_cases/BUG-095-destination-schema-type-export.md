# BUG-095: Client codegen dropped T_Destination and other schema types

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-19
> **Date Fixed:** 2026-08-19
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟠 High

## Description

`next build` failed during typecheck. `#shared/graphql` had no `T_Destination`, so club and resort pages could not import the destination entity type.

## Reproduction steps

1. Run `pnpm --prefix ssl-fe-user build`.
2. Wait for the Next typecheck of `src/app/[locale]/(main)/(destination)/club/[slug]/page.tsx`.

**Expected behavior:** The page typechecks and the build continues.
**Actual behavior:** TypeScript reports `Module '"#shared/graphql"' has no exported member 'T_Destination'`.

## Evidence

```
./src/app/[locale]/(main)/(destination)/club/[slug]/page.tsx:5:15
Type error: Module '"#shared/graphql"' has no exported member 'T_Destination'.
```

## Tracing evidence

Jaeger was not used. This fails at compile time, before a request span exists.

## PostHog evidence

Not used. This is a local build type error, not a captured browser session.

## Root cause analysis

`createGraphqlCodegenConfig({ target: 'client' })` uses the GraphQL Code Generator client preset. That preset sets `onlyOperationTypes: true`, so `generated/graphql.ts` keeps enums, inputs, fragments, and operations, and drops schema types such as `T_Destination`. The app still imports those schema names from `#shared/graphql`.

`pnpm generate` could not restore the types here because the local `graphql@17.0.0` package is missing `validation/validate.mjs`.

**Related files:**
- [graphql.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/generated/graphql.ts)
- [index.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/index.ts)
- [graphql-schema-types.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/graphql-schema-types.ts)
- [graphql.config.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/graphql.config.ts)
- [page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(main)/(destination)/club/[slug]/page.tsx)

## Fix applied

Added `graphql-schema-types.ts` aliases: fragment types for names that still have `F_*Fragment`, plus small schema shapes for `T_Auth`, `T_UploadResult`, profile-visit responses, and `U_LocationEntity`. `#shared/graphql` re-exports those type names.

Set `onlyOperationTypes: false` on the client codegen output so a later successful generate can emit the real schema types again.

Club and resort FAQ mapping used `getLocalizedString(...) || faq.question`. Fragment JSON fields are `unknown`, so that widened the mapped objects and failed `generateFAQSchema`. The fallback is now the localized string only.

## Unit / Regression Test

- **Test File:** [graphql-schema-types.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/graphql-schema-types.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user exec vitest --config src/shared/vitest/vitest.config.unit.ts run src/shared/graphql/graphql-schema-types.test.unit.ts`
- **Test Results:** The barrel still names `T_Destination`. A destination object can be assigned to `U_LocationEntity`. `T_UploadResult` still has `url` and `moderationMediaId`.

## Lessons learned

Client-preset codegen is not a drop-in replacement for schema-type imports. After a generate, check that `T_*` names used by pages still exist on `#shared/graphql`.

## References

- Related bug cases: BUG-094
- Jaeger traces: unavailable
