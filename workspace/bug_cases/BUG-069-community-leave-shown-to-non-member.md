# BUG-069: Public community shows Leave to a visitor who has not joined

> **Status:** Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-fe-user)
> **Severity:** High

## Description

A logged-in user who has not joined a public community sees "Leave Community", the notifications toggle, and the Create Post box. The cover should show "Join Community". Only members can leave, mute, or post.

## Reproduction steps

1. Create a public community as user A (for example "Community name for TC-01").
2. Log in as user B, who is not a member.
3. Open `/en/communities/<slug>/feed`.

**Expected behavior:** The cover shows "Join Community". Create Post is hidden until the user joins.
**Actual behavior:** The cover shows "Leave Community" and "Notifications on". Create Post is visible.

## Evidence

Local screenshot on `localhost:8001/en/communities/community-name-for-tc-01/feed`. The community lists 1 member (the creator). The visitor is a different account.

## Tracing evidence

Jaeger was not used. This is a frontend membership gate. The backend `joinCommunity` / `leaveCommunity` checks were not the source.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

`CommunityCover` shows Leave whenever `onLeave` is passed. The public feed always passed `onLeave` and `onToggleNotifications`, and treated `canView` as true for every public community, so Create Post rendered for visitors.

`useGetCommunityMembership` already returns null for non-members. The page never used that result to choose Join vs Leave.

**Related files:**
- [feed/page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/[communitySlug]/feed/page.client.tsx)
- [community-cover.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-cover.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

`isCommunityMember` is true only for a membership id or the creator. The feed passes `onJoin` for visitors and `onLeave` plus notifications only for members. Create Post renders only for members. Private visitors get "Request Access" on the cover.

## Unit / regression test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit src/modules/communities/communities.type.test.unit.ts`
- **Test Results:** 6 passed. `isCommunityMember` is false without a membership id, true for a member or the creator.

## Lessons learned

A public community can be viewed without membership. Viewer access must not reuse the member action bar.

## References

- Word doc section 3: Join on an open community makes the user a member immediately.
- Related: [BUG-068](BUG-068-community-word-doc-alignment.md)
