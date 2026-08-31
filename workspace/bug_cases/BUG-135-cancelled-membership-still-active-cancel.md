# BUG-135: Cancelled membership still shows Active + Cancel Membership

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-30
> **Date Fixed:** 2026-08-30
> **Project:** SSL (ssl-fe-user / ssl-be)
> **Severity:** 🟠 High

---

## 🔍 Description

On `/en/membership`, a user who already cancelled paid membership still saw **Active** (with “Ends in N days”), **Manage membership**, and **Cancel Membership**. Re-cancel could hit PayPal again even though `membershipCancelled` was already true.

## 🔄 Reproduction Steps

1. Log in as a paid member with `membershipCancelled=true` and future `membershipExpiresAt`.
2. Open `/en/membership`.
3. Observe membership card and Delete My Profile CTAs.

**Expected behavior:** Pending-downgrade status, Manage disabled, Cancel Membership hidden; confirm copy says access remains until expiry.
**Actual behavior:** Card said Active + Ends in N days; Cancel Membership still offered.

## 📸 Evidence

Goldfish capture 2026-08-30 10:26 on `development.secretswingerlust.com/en/membership`:
Member · Verified, Active, Ends in 89 days, Cancel Membership visible.

## 🔭 Tracing Evidence

N/A (UI + idempotent BE guard; observed via Goldfish accessibility capture).

## 📊 PostHog Evidence

N/A for this capture-driven fix.

## 🧠 Root Cause Analysis

`MembershipDesign` only swapped the subtitle when `isCancelled`; headline stayed `Active` and Manage stayed enabled. `MembershipPage` rendered Cancel Membership for any `isMember`, and confirm copy claimed immediate loss of premium. BE `cancelMembership` re-ran PayPal cancel whenever `isMembershipActive` (expiry-only) was true, ignoring `membershipCancelled`.

**Related files:**
- [membership-design.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/membership/membership-design.tsx)
- [membership.page.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/membership/membership.page.tsx)
- [authn.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/authn/authn.controller.ts)

## 🔧 Fix Applied

- Cancelled card: pending-downgrade headline/subline; Manage disabled as Downgrade Pending.
- Hide Cancel Membership when cancelled; confirm uses keep-until-expiry downgrade copy.
- BE: if `membershipCancelled` already, return success and skip PayPal.

## 🧪 Unit / Regression Test

- **Test File:** membership-design.test.unit.tsx, membership.page.test.unit.tsx, membership.page.test.e2e.ts, authn.cancel-membership.test.ts
- **Command:** `pnpm --prefix ssl-fe-user exec dotenvx run -- vitest run --config src/shared/vitest/vitest.config.unit.ts src/modules/membership/` (+ e2e config); `pnpm --prefix ssl-be exec vitest run src/modules/authn/authn.cancel-membership.test.ts`
- **Test Results:** FE unit 4 passed; FE e2e 3 passed; BE util 2 passed. Cancelled card shows pending + disabled Manage; Cancel Membership hidden; BE already-cancelled skips PayPal path.

## 📝 Lessons Learned

- Cancelled-but-unexpired is a distinct UI state from Active renewing.
- Provider cancel must be idempotent when local cancel flag is already set.

## 🔗 References

- Goldfish capture: development membership page 2026-08-30 10:26
