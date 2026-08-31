# BUG-090: Community notification username missing accountType color

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-be, ssl-fe-user)
> **Severity:** 🟡 Medium

---

## Description

Community notification usernames rendered in white instead of the profile color that other notifications use from `accountType` (and gender for singles).

## Reproduction steps

1. Create a community post as a user whose `accountType` is `SINGLE` (or `COUPLE`).
2. Open the in-app notification popup as another member.

**Expected behavior:** The author username uses the same color as their profile name.
**Actual behavior:** The username stayed white because `presentation.actor.accountType` and `gender` were null.

## Evidence

Local GraphQL payload for a `COMMUNITY_NEW_POST` included `actor.username: "Sweetcandy"` with `accountType: null` and `gender: null`.

## Tracing evidence

Jaeger was not required. The create path never stored account type, and the list path did not copy it from the live user.

## PostHog evidence

Not used.

## Root cause analysis

`buildCommunityPresentation` only stored `actor.username`. `notifyNewPost` then overwrote `actor` with `{ username }` only. `getNotifications` already loaded each actor's `accountType` and `partner1.gender` but only copied the username onto the presentation. `getProfileNameClass` also treated `SINGLE_MALE` / `SINGLE_FEMALE` as unknown and fell back to white.

**Related files:**
- [community-notification.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.ts)
- [notification.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/notification/notification.controller.ts)
- [notification.utils.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.ts)

## Fix applied

- Persist `accountType` and `gender` on community notification create.
- Copy those live user fields onto `presentation.actor` when listing notifications.
- Map `SINGLE_MALE` / `SINGLE_FEMALE` to the same blue / red classes as `SINGLE` + gender.

## Unit / Regression test

- **Test File:** [community-notification.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community-notification.service.test.ts)
- **Test File:** [notification.utils.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/notification/notification.utils.test.unit.ts)
- **Command:** `pnpm --prefix ssl-be exec vitest run src/modules/community/community-notification.service.test.ts` and `pnpm --prefix ssl-fe-user exec vitest run src/modules/notification/notification.utils.test.unit.ts`
- **Test Results:** New-post payload includes `actor.accountType` and `gender`. `getProfileNameClass` returns red / blue / couple gradient for the matching account types.

## Lessons learned

Username color depends on fields that must be present at render time. Storing only the display name is not enough when the list item keys off `accountType`.

## References

- Related bug cases: BUG-089
