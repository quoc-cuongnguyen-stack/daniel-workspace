# BUG-043: Missing `slug` Field in `Input_QueryCommunity` GraphQL Schema & Incorrect Route Lookup Fix

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-06
> **Date Fixed:** 2026-08-06
> **Project:** ssl-be / ssl-fe-user
> **Severity:** 🟠 High

---

## 🔍 Description

Communities pages use slug-based route parameters (e.g. `/communities/[communitySlug]`). However, commit `16e1477f` removed `useGetCommunity({ slug: communitySlug })` and replaced it with `useGetCommunity({ id: communitySlug })` across all community page components. Passing a string slug (e.g. `berlin-swingers`) to `id` filter caused community detail queries to fail because `id` expects a Mongo ObjectId or UUID.

## 🧠 Root Cause Analysis

1. In `ssl-be/src/modules/community/community.graphql`, the GraphQL input type `Input_QueryCommunity` omitted `slug: JSON`, even though `I_Community` has `slug` and `communityCtr.getCommunity` specifically supports searching by `slug` across multilingual fields (`slug.en`, `slug.de`, `slug.es`, etc.).
2. When frontend GraphQL codegen generated `Input_QueryCommunity` for `ssl-fe-user`, `slug` was missing from the generated type.
3. During frontend refactoring in commit `16e1477f`, encountering a TypeScript type error on `{ slug: communitySlug }` led to erroneously changing `{ slug: communitySlug }` to `{ id: communitySlug }` in page components, rather than adding `slug: JSON` to `Input_QueryCommunity` in the backend GraphQL schema.

## 🔧 Fix Applied

1. Added `slug: JSON` to `input Input_QueryCommunity` in [community.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.graphql#L80).
2. Regenerated / updated `ssl-fe-user` GraphQL types in [graphql.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/generated/graphql.ts#L1893).
3. Restored `useGetCommunity({ slug: communitySlug })` in:
   - [apply/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/apply/page.client.tsx#L28)
   - [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx#L43)
   - [gallery/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/gallery/page.client.tsx#L37)
   - [members/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/members/page.client.tsx#L51)
   - [moderator/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/moderator/page.client.tsx#L42)

## 🧪 Unit / Regression Test

- **Test File:** [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts#L63)
- **Command:** `pnpm --filter ssl-be test src/modules/community/community.controller.test.ts`
- **Test Results:** 13/13 tests passed, verifying string slug queries resolve `$or` regex/multilingual fields correctly.

## 📝 Lessons Learned

- When encountering a GraphQL input type mismatch in frontend code, always check if the backend controller implementation supports the query before modifying the frontend call pattern.
- Input types in GraphQL schema files (`.graphql`) must stay in sync with TypeScript interfaces (`.type.ts`) and controller filtering capabilities.
