# BUG-070: Join community fails because F_Community is spread on T_CommunityMember

> **Status:** Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-fe-user)
> **Severity:** High

## Description

Clicking Join Community on a public community fails with a GraphQL validation error: Fragment "F_Community" cannot be spread here as objects of type "T_CommunityMember" can never be of type "T_Community".

## Reproduction steps

1. Log in as a user who is not a member of a public community.
2. Open the community feed and click Join Community.

**Expected behavior:** The user becomes a member. The cover switches to Leave Community.
**Actual behavior:** The request fails with the fragment type error.

## Evidence

```text
Fragment "F_Community" cannot be spread here as objects of type "T_CommunityMember" can never be of type "T_Community".
```

## Tracing evidence

Jaeger was not used. The server rejected the operation during GraphQL validation before joinCommunity ran.

## PostHog evidence

No Superthread task or session recording was linked.

## Root cause analysis

Backend schema:

- `joinCommunity`: `T_Response_CommunityMember`
- `leaveCommunity`: `T_Response_CommunityMember`
- `assignCommunityRole`: `T_Response_CommunityMember`
- `becomeCommunityAdministrator`: `T_Response_Community`

The client mutations for join, leave, and assign-role spread `F_Community` on `result`. That fragment is defined on `T_Community`.

**Related files:**
- [communities.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.graphql)
- [community.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.graphql)

## Fix applied

Those three mutations now spread `F_CommunityMember`. GraphQL codegen was rerun. Become Administrator still spreads `F_Community`.

## Unit / regression test

- **Test File:** [communities.graphql.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.graphql.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit src/modules/communities/communities.graphql.test.unit.ts`
- **Test Results:** 2 passed. Join, leave, and assign-role spread F_CommunityMember. Become Administrator still spreads F_Community.

## Lessons learned

When a mutation return type changes from community to member, the client fragment must change in the same commit.

## References

- Related: [BUG-069](BUG-069-community-leave-shown-to-non-member.md)
