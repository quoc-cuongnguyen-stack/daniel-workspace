# BUG-081: Community list name shows raw translation JSON

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## Description

On `/fr/communities`, My Communities rendered the community name as `{"en":"Community fo...` instead of the localized title.

## Reproduction steps

1. Open `/fr/communities` with at least one joined community whose `name` is a locale map.
2. Look at the left My Communities list.

**Expected behavior:** The title uses the active locale, or English / the first available string.
**Actual behavior:** The sidebar stringified the translation object.

## Evidence

Screenshot of MY COMMUNITIES (1) showing `{"en":"Community fo...` above Ba Vi, Vietnam.

## Tracing evidence

Jaeger was not required. This is list-item rendering.

## PostHog evidence

None.

## Root cause analysis

`CommunitiesSidebar` treated a non-string `name` as `JSON.stringify(community.name)`. Cards and the cover already use `useLocalizedText`.

**Related files:**
- [sidebar.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/layout/communities/sidebar.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [localized-text.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/util/localized-text.ts)

## Fix applied

`getCommunityDisplayName` resolves the active locale, then `en`, then the first string. The sidebar uses that helper.

## Unit / regression test

- [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)

## Lessons learned

Localized GraphQL fields are objects. Never stringify them for display.

## References

- Related: [BUG-079](BUG-079-community-cover-sidebar-placeholder.md)
