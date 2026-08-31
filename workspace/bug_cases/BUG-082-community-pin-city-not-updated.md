# BUG-082: City / Location empty after dragging the community pin

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

On Create Community → Basic, dragging the map pin filled Country but left City / Location on the placeholder.

## Reproduction steps

1. Open Create Community, Basic step.
2. Drag the map pin to a place (for example Ba Vi, Vietnam).
3. Watch Country and City / Location.

**Expected behavior:** Both fields update from reverse geocoding.
**Actual behavior:** Country updates. City / Location stays empty.

## Evidence

User report after the first reverse-geocode pass.

## Tracing evidence

Jaeger was not required. This is client reverse geocoding + select binding.

## PostHog evidence

None.

## Root cause analysis

MapTiler often puts the settlement in `region` / `county` context, which the parser ignored, so `cityName` was empty. When a label was found but GetCities did not return an id, SearchableSelect still bound `value={cityId}` and only merged an option when `cityId` was set, so the field stayed on the placeholder.

**Related files:**
- [community-reverse-geocode.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/community-reverse-geocode.ts)
- [community-reverse-geocode.hook.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/community-reverse-geocode.hook.ts)
- [step-basic.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/create-wizard/step-basic.tsx)

## Fix applied

Collect region/county/place candidates and try each against GetCities. Bind the city select with `getCommunityCitySelectValue(cityId, cityName)` so a geocoded label still renders when no id is matched.

## Unit / regression test

- [community-reverse-geocode.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/community-reverse-geocode.test.unit.ts)

## Lessons learned

A SearchableSelect only shows a value that exists in `options` and matches `value`. A geocoded label without an id is invisible unless both are set.

## References

- Follow-up to the Create Community pin reverse-geocode work
