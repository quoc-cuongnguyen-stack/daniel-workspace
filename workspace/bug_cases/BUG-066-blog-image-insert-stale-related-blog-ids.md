# BUG-066: Blog image insertion blocked by stale related blog IDs

> **Status:** Fixed
> **Date Found:** 2026-08-16
> **Date Fixed:** 2026-08-16
> **Project:** SSL
> **Severity:** Medium

## Description

Saving an existing blog after inserting an image into its content returned `One or more relatedBlogsIds do not exist`. The content change itself was valid, but the admin form resubmitted the blog's unchanged `relatedBlogsIds`. If one referenced blog had since been deleted, backend validation rejected the entire update.

## Reproduction steps

1. Edit a blog whose stored `relatedBlogsIds` contains an ID for a blog that was later soft-deleted.
2. Insert an image into the blog text without changing related articles.
3. Save the blog.

**Expected behavior:** The unrelated content update succeeds because the related article relationship did not change.

**Actual behavior:** The update fails with `One or more relatedBlogsIds do not exist`.

## Evidence

```text
One or more relatedBlogsIds do not exist
```

The regression test reproduced the failure before the fix:

```text
FAIL blogWriteService > does not revalidate unchanged legacy related blog IDs during an unrelated update
Error: One or more relatedBlogsIds do not exist
```

## Tracing evidence

Jaeger was unavailable at `http://localhost:16686`, so no local trace was captured. The backend error text maps directly to `blogReferenceService.assertRelatedBlogIdsExist`.

## PostHog evidence

No PostHog recording or error-tracking URL was supplied. PostHog data was not queried because the available tools did not expose the project integration in this session.

## Root cause analysis

`blogWriteService.updateBlog` validated `update.relatedBlogsIds` on every update. The admin blog form sends the full form payload, including unchanged related IDs. This allowed stale legacy references to block unrelated content edits such as image insertion.

The fix compares incoming related IDs with the stored relationship. Validation runs only when the update actually changes that relationship. New or changed related IDs remain protected by the existing existence check.

**Related files:**

- [blog-write.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.ts)
- [blog-write.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.test.ts)
- [blog-form.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/blog/blog-form.tsx)

## Fix applied

`updateBlog` now skips related-blog validation when the incoming string values match the stored values. It still validates any changed relationship before writing.

## Unit / regression test

- **Test file:** [blog-write.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/blog/blog-write.service.test.ts)
- **Command:** `pnpm --prefix ssl-be test src/modules/blog/blog-write.service.test.ts --run`
- **Result:** 10 tests passed.
- **Cases:** An unrelated content update with an unchanged stale related ID succeeds, while changed related IDs still invoke validation.

## Lessons learned

PATCH-style update validation should distinguish changed relationships from unchanged legacy data. Full-form submissions can contain stale values unrelated to the user's edit.

## References

- Conversation: `desktop-489c8599-1d9a-4480-91e2-8b054090fd9c`
- Knowledge item: Blocked until the exact application data directory is provided.
