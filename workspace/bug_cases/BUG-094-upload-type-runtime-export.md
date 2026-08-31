# BUG-094: GraphQL enums are type-only and break Turbopack value imports

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-19
> **Date Fixed:** 2026-08-19
> **Project:** SSL (ssl-fe-user)
> **Severity:** 🟠 High

---

## Description

Next/Turbopack failed to compile help-support and conversation pages. `#shared/graphql` re-exported codegen enums as `export type` unions, so `import { E_UploadType }` had no runtime binding.

## Reproduction steps

1. Open `/help-support` or a conversation thread on the user app with Turbopack.
2. Watch the compile overlay.

**Expected behavior:** The page compiles and `useMediaUpload({ type: E_UploadType.IMAGE })` works.
**Actual behavior:** Turbopack reports `Export E_UploadType doesn't exist in target module` for `help-support/index.tsx` and `conversation/component/message.tsx`.

## Evidence

```
The export E_UploadType was not found in module
[project]/src/shared/graphql/index.ts [app-client] (ecmascript).
Did you mean to import UploadDocument?
All exports of the module are statically known (It doesn't have dynamic exports).
```

## Tracing evidence

Jaeger was not used. This fails at module compile time, before a request span exists.

## PostHog evidence

Not used. This is a local/dev compile error, not a captured browser session.

## Root cause analysis

`createGraphqlCodegenConfig` now emits GraphQL enums as TypeScript string unions (`export type E_UploadType = 'IMAGE' | 'VIDEO' | ...`). Types are erased at emit time. App code still imports those names as values (`E_UploadType.IMAGE`). `src/shared/graphql/index.ts` only re-exported the generated file, so Turbopack correctly rejected the missing runtime export.

The same gap exists for every other `E_*` enum used as `Enum.VALUE`.

**Related files:**
- [graphql.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/generated/graphql.ts)
- [index.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/index.ts)
- [graphql-enums.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/graphql-enums.ts)
- [help-support/index.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(main)/(public)/help-support/index.tsx)
- [message.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/conversation/component/message.tsx)
- [use-media-upload.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/hook/use-media-upload.tsx)

## Fix applied

Added `graphql-enums.ts` with runtime const objects matching the generated unions, and re-exported them from `#shared/graphql`. Existing `E_UploadType.IMAGE` call sites keep working.

## Unit / Regression Test

- **Test File:** [graphql-enums.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/graphql/graphql-enums.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user exec vitest --config src/shared/vitest/vitest.config.unit.ts run src/shared/graphql/graphql-enums.test.unit.ts`
- **Test Results:** `E_UploadType` and `E_UploadEntity` exist at runtime; `.IMAGE`, `.VIDEO`, `.CONVERSATION`, and `.GALLERY` equal the expected strings.

## Lessons learned

After codegen switches to `enumsAsTypes`, every `Enum.VALUE` import needs a runtime companion. Regenerating GraphQL types is not enough if the barrel only re-exports type-only unions.

## References

- Related bug cases: BUG-092
- Jaeger traces: unavailable
