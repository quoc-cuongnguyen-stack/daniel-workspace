# BUG-071: Public community apply page still required a request

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

Word doc §3: open (public) communities must make the user a member immediately. Private communities are the only ones that send an application to moderators.

`joinCommunity` already created a MEMBER row for public communities, and `applyToCommunity` already rejected public applications. Visiting `/communities/:slug/apply` on a public community still rendered "Send application" and the private-community notice.

## Reproduction steps

1. Log in as a user who is not a member of a public community.
2. Open `/communities/<public-slug>/apply`, or land there from an old Request Access link.

**Expected behavior:** The user joins immediately and is sent to the feed. No pending application is created.
**Actual behavior:** The application form is shown. Submitting it fails with "This is an open community. You can join directly without applying."

## Evidence

Backend already throws on public `applyToCommunity`. The apply page did not check `isPrivate` before rendering the form.

## Tracing evidence

Jaeger was not used. This is a client routing gap on top of an already-correct API.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

Join vs apply was duplicated across the feed, card, and apply page. The apply page always assumed a private community.

**Related files:**
- [apply/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/apply/page.client.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [community-application.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.ts)
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)

## Fix applied

- Added `getCommunityJoinAction`: public → `join`, private → `apply`.
- Apply page auto-joins public communities and redirects to the feed.
- Feed and listing cards use the same helper.
- Regression tests cover public join membership and rejected public applications.

## Unit / Regression test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts), [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts), [community-application.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-application.controller.test.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community.controller.test.ts src/modules/community/community-application.controller.test.ts` and `pnpm --prefix ssl-fe-user exec vitest run src/modules/communities/communities.type.test.unit.ts`

## Lessons learned

API rejection alone is not enough when a dedicated apply route still renders the request form.

## References

- Related bug cases: BUG-069, BUG-070
- Word doc: Færdig_Comunity Projekt.docx §3 Open Communities
