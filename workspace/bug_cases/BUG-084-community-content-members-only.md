# BUG-084: C-977 community feed visible before joining

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

C-977: only community members may enter the feed and other content. Before joining, a user may see the preview, name, short description, tags, and member count. Public communities grant access immediately on Join Community. Private communities grant access only after an administrator approves the request.

Visitors of public communities could still open the feed, gallery, and members list.

## Reproduction steps

1. Log in as a user who is not a member of a public community.
2. Open `/communities/<slug>/feed`.

**Expected behavior:** Preview only, plus Join Community. No posts, gallery, or members.
**Actual behavior:** The public feed, about panel, rules, and most-active members were visible.

## Evidence

`requireCommunityViewAccess` and `requireCommunityMemberViewAccess` returned early when `isPrivate` was false. Feed/gallery/members set `canView = true` for every public community.

## Tracing evidence

Jaeger was not required.

## PostHog evidence

No PostHog link on [C-977](https://app.superthread.com/cnlgaming/card-977-fb-community-membership-2).

## Root cause analysis

Public communities were treated as readable by any logged-in user. Membership was required only for private communities and for write actions.

**Related files:**
- [community-post.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.ts)
- [community.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.ts)
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)
- [gallery/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/gallery/page.client.tsx)
- [members/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/members/page.client.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

Content reads now require a membership row or the creator. The UI shows the cover preview and `CommunityAccessGate` until the user joins (public) or is approved (private).

## Unit / regression test

- [community-post.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.service.test.ts)
- [community.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.test.ts)
- [community-post.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-post.controller.test.ts)
- [community.controller.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.test.ts)
- [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)

## Lessons learned

A public community can be listed and joined immediately. That is not the same as letting non-members read the feed.

## References

- Superthread: [C-977](https://app.superthread.com/cnlgaming/card-977-fb-community-membership-2)
- Related: BUG-069, BUG-071
