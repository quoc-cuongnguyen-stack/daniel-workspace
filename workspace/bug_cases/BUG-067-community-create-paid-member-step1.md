# BUG-067: Free members reach step 4 before the paid-community create error

> **Status:** Superseded by [BUG-068](BUG-068-community-word-doc-alignment.md). The Word doc allows any logged-in member to create a community.
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-fe-user)
> **Severity:** Medium

## Description

The community create wizard let free members fill steps 1-4. The paid-member check lived only in backend `createCommunity`, so "Only paid members can create communities." appeared after submit on step 4.

## Reproduction steps

1. Log in as a free member.
2. Open `/communities/create`.
3. Complete Basic, Design, Tags, and Rules.
4. Submit on step 4.

**Expected behavior:** The paid-member error appears on step 1. The user cannot continue the wizard.
**Actual behavior:** The wizard advanced through all four steps. The error appeared only when `createCommunity` failed.

## Evidence

```text
Only paid members can create communities.
```

The backend already rejected create with that message. The frontend only surfaced it in the step 4 submit `catch`.

## Tracing evidence

Jaeger was not used. This is a frontend gate around an existing backend check.

## PostHog evidence

No Superthread task or session recording was linked. The failure is an expected 403 on create, not a client exception.

## Root cause analysis

`StepBasic.handleContinue` validated name and location only. Step tabs called `setStep` with no membership check. `handleSubmit` called `createCommunity` and toasted the backend error after the user finished the wizard.

**Related files:**
- [page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/create/page.client.tsx)
- [step-basic.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/create-wizard/step-basic.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [community.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.controller.ts)

## Fix applied

`getCommunityCreateEligibilityError` now returns the existing backend message for free or expired members. The create page toasts it when auth resolves, blocks later steps, and blocks submit. Step 1 Continue checks membership before name and location. Edit mode still skips the gate because `updateCommunity` does not re-check membership.

## Unit / regression test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-user test:unit src/modules/communities/communities.type.test.unit.ts`
- **Test Results:** 5 passed. Free and expired members get the paid-only error. Active paid and promo members pass. Edit mode is allowed.

## Lessons learned

Server-only membership checks waste the user's time on multi-step forms. Put the same rule on the first step, and keep the API check.

## References

- Backend create guard: `ssl-be/src/modules/community/community.controller.ts`
- Knowledge item: Blocked until the exact application data directory is provided.
