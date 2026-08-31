# BUG-079: Community cover missing in My Communities sidebar

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

C-950: after creating a community with a cover image, `/fr/communities` My Communities (MES COMMUNAUTÉS) showed a black square for every community instead of the uploaded image.

## Reproduction steps

1. Create a community and upload a cover image.
2. Open `/fr/communities`.
3. Look at the left My Communities list.

**Expected behavior:** Each community shows its uploaded cover.
**Actual behavior:** Every row used an empty black placeholder.

## Evidence

Superthread C-950 screenshot of black squares next to test 1, Test 2, DA Comm, Test 4, Test 3.

## Tracing evidence

Jaeger was not required. This is list-response filtering.

## PostHog evidence

C-950 had no PostHog session or error link.

## Root cause analysis

`hideUnapprovedCommunityMedia` ran on `getMyCommunities` and kept only APPROVED header/logo media. New covers are usually PENDING after AI review, so `coverImage` was cleared on every list read even though the URL was stored.

**Related files:**
- [community.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.ts)
- [sidebar.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/layout/communities/sidebar.tsx)

## Fix applied

Keep pending and approved identity images. Hide only rejected covers/logos. Sidebar reads the cover (then logo) through `getCommunityThumbnailUrl`.

## Unit / regression test

- [community.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.test.ts)
- [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)

## Lessons learned

Community identity images follow the same pending-visible rule as post media. Do not treat pending as hidden.

## References

- Superthread: [C-950](https://app.superthread.com/cnlgaming/card-950-bug-uploaded-community-thumbnailcover-image-is-not-saved-or-displayed-in-my-communities-sidebar-list)
