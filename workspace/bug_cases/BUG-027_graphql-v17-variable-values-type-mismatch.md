# BUG-027: GraphQL v17 VariableValues Type Mismatch in Selection Signature & Tests

> **Status:** ✅ Fixed
> **Date Found:** 2026-07-29
> **Date Fixed:** 2026-07-29
> **Project:** SSL (ssl-be)
> **Severity:** 🟠 High

---

## 🔍 Description

Upgrading to `graphql@17.0.0` changed `GraphQLResolveInfo['variableValues']` from `Record<string, unknown>` to the `VariableValues` interface (`{ coerced?: Record<string, unknown>; sources?: ... }`). As a result, code expecting a flat `Record<string, unknown>` or directly indexing `variableValues[key]` triggered TypeScript compilation errors in `buildResultSelectionSignature` and test helpers (`infoFromQuery`).

## 🔄 Reproduction Steps

1. Run TypeScript type checker in `ssl-be`: `pnpm exec tsc --noEmit`.
2. Observe 3 compilation errors:
   - `Type 'Record<string, unknown>' is missing the following properties from type 'VariableValues': sources, coerced` in `blog-resolver-cache.test.ts:232:9` and `graphql-selection-signature.test.ts:240:9`.
   - `Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'VariableValues'` in `graphql-selection-signature.ts:106:31`.

## 📸 Evidence

```
src/modules/blog/blog-resolver-cache.test.ts:232:9 - error TS2741: Type 'Record<string, unknown>' is missing the following properties from type 'VariableValues': sources, coerced
src/shared/query/graphql-selection-signature.test.ts:240:9 - error TS2741: Type 'Record<string, unknown>' is missing the following properties from type 'VariableValues': sources, coerced
src/shared/query/graphql-selection-signature.ts:106:31 - error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'VariableValues'.
```

## 🧠 Root Cause Analysis

In GraphQL v17:
1. `GraphQLResolveInfo['variableValues']` is typed as `VariableValues` (an object containing `.coerced` map and `.sources`).
2. `graphql-selection-signature.ts` indexed `variableValues[value.name.value]` directly without checking if `variableValues` was structured as `{ coerced: { ... } }` or flat dictionary `{ key: value }`.
3. Test utilities (`infoFromQuery`) constructed mock `GraphQLResolveInfo` and `T_ResultSelectionSignatureInfo` passing a flat `Record<string, unknown>`, breaking type compatibility.

## 🔧 Fix Applied

1. Updated `T_VariableValues` in [graphql-selection-signature.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/shared/query/graphql-selection-signature.ts) to union `GraphQLResolveInfo['variableValues'] | Record<string, unknown>`.
2. Updated `T_ResultSelectionSignatureInfo` to accept flexible `variableValues`.
3. Created `getVariableValue` helper function to extract values whether stored under `coerced` object (GraphQL v17 standard) or top-level dictionary (mock/legacy standard).
4. Updated test helper mock objects in `blog-resolver-cache.test.ts` to wrap mock variables under `{ coerced: variableValues }` and safely cast to `GraphQLResolveInfo`.

## 🧪 Unit / Regression Test

- **Test Files:**
  - [graphql-selection-signature.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/shared/query/graphql-selection-signature.test.ts)
  - [blog-resolver-cache.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-resolver-cache.test.ts)
- **Command:** `pnpm exec tsc --noEmit && pnpm test src/shared/query/graphql-selection-signature.test.ts src/modules/blog/blog-resolver-cache.test.ts`
- **Result:** TypeScript check passed with 0 errors; all 9 tests passed cleanly.

## 📝 Lessons Learned

When upgrading major GraphQL library versions, check `GraphQLResolveInfo` field definitions as internal types like `variableValues` change from flat key-value dictionaries to structured container types (`VariableValues`).
