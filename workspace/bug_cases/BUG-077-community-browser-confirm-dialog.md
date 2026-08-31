# BUG-077: Community actions used browser confirm()

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

Deleting a community comment opened the native browser dialog (`localhost:8001 says` / `Delete this comment?`). The same `window.confirm` pattern was used for delete post, leave community, kick/ban, and reject post.

## Reproduction steps

1. Open a community feed.
2. Click Delete on your own comment.

**Expected behavior:** The in-app Confirmation modal opens.
**Actual behavior:** Chrome showed a native confirm dialog.

## Evidence

Screenshot of the native confirm over the community feed.

## Tracing evidence

Jaeger was not used. This is a frontend dialog.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

Community UI called `window.confirm` instead of `#shared/component/ui/confirmation` and `useConfirmation`.

**Related files:**
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)
- [moderator/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/moderator/page.client.tsx)

## Fix applied

Replaced every community `window.confirm` with the existing Confirmation modal.

## Unit / Regression test

No new unit test. This is dialog wiring over the existing Confirmation component.

## Lessons learned

Do not use `alert`, `confirm`, or `prompt` in product UI.

## References

- Related bug cases: BUG-076
