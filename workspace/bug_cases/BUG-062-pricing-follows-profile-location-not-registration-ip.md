# BUG-062: Admin Control country and price follow profile location, not registration IP

> **Status:** 🔵 In Progress
> **Date Found:** 2026-08-13
> **Date Fixed:**
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

After `backfill-registration-ip.ts` ran on develop, the user membership UI priced Sweetcandy as Vietnam (registration IP `115.72.191.9`). Admin Control still showed Denmark from the profile location, including Denmark membership price and VAT.

## Reproduction Steps

1. Open [Admin Control for Sweetcandy](https://development-admin.secretswingerlust.com/admin-control?username=Sweet).
2. Compare Country, Price, and VAT with the user membership page for the same account.

**Expected behavior:** Admin country, price, and VAT use registration IP (Vietnam / $7 / 10% VAT).
**Actual behavior:** Admin uses `partner1.location.country` (Denmark / €9 / 25% VAT).

## Evidence

Develop `getUser` for Sweetcandy:

- `registrationIp`: `115.72.191.9`
- `lastLoginIp`: `115.72.191.9`
- `registrationCountryId`: null (IP backfill ran; country id backfill did not)
- Profile country: Denmark (`id` 59, `DK`)
- IP geo: Vietnam (`VN`)

Local Mongo was a false lead (`ssl-be/.env` points at localhost). The mismatch is on develop.

## Tracing Evidence

Not applicable. Admin list cells read the wrong user fields. No failing backend span.

## PostHog Evidence

Not applicable. This is an admin display mismatch, not a client exception.

## Root Cause Analysis

`getSubscriptionPrice` prefers `registrationCountryId`, then `registrationIp` / `lastLoginIp` geo, then profile country. Admin Control never followed that path:

- Country: `user.partner1.location.country.name`
- Price / VAT: `UserPricingCell` with `countryId={user.partner1?.location?.countryId}`
- The list fragment did not request `registrationIp` or `registrationCountryId`

The original backfill filter `{ registrationIp: { $exists: false } }` also skipped documents where the field exists as `null`, so a second run would not fill `registrationCountryId`.

**Related files:**
- [user-list.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/user/user-list.tsx)
- [user-pricing-cell.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/user/user-pricing-cell.tsx)
- [user-registration-country.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/user/user-registration-country.ts)
- [user.fragment.graphql](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/user/user.fragment.graphql)
- [backfill-registration-ip.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/scripts/backfill-registration-ip.ts)
- [pricing.controller.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/pricing/pricing.controller.ts)

## Fix Applied

Admin Country / Price / VAT / IP columns use `registrationCountryId` plus `registrationIp` (fallback `lastLoginIp`). They no longer pass profile `countryId` into `UserPricingCell`. If `registrationCountryId` is empty, the country cell resolves a name from IP geo.

Backend exposes `registrationCountry`, populates it, and the backfill now treats null/empty IP as missing and fills `registrationCountryId` from IP geo.

Sweetcandy on develop can show Vietnam after an admin deploy without re-running backfill, because price cells will use the IP path. Filling `registrationCountryId` still needs the updated backfill after a backend deploy.

## Unit / Regression Test

- **Test File:** [user-registration-country.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-admin/src/modules/user/user-registration-country.test.unit.ts)
- **Command:** `pnpm --prefix ssl-fe-admin test:unit src/modules/user/user-registration-country.test.unit.ts src/modules/user/user-graphql-selection.test.unit.ts src/modules/user/user-list.test.unit.tsx` and `pnpm --prefix ssl-be test src/scripts/backfill-registration-ip.util.test.ts src/modules/user/user-read.policy.test.ts`
- **Test Results:** Admin 13 passed (`user-registration-country.test.unit.ts`, `user-graphql-selection.test.unit.ts`, `user-list.test.unit.tsx`). Backend 8 passed (`backfill-registration-ip.util.test.ts`, `user-read.policy.test.ts`).

## Lessons Learned

Admin list cells that show geo-priced fields must share the same source as `getSubscriptionPrice`. A Mongo `$exists: false` backfill misses explicit nulls.

## References

- Admin Control: [Sweetcandy](https://development-admin.secretswingerlust.com/admin-control?username=Sweet)
