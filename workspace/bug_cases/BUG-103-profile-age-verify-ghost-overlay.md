# BUG-103: Age-verify ghost still shown on profile cards

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-20
> **Date Fixed:** 2026-08-20
> **Project:** SSL
> **Severity:** 🟢 Low

---

## Description

Removing the 18? ghost from `CardGallery` did not change `/en/profile/Eldorado`. That page still draws `AgeVerifyOverlay`, which rendered `/age-verify/not-age-verified.svg` on the blurred partner cards.

## Reproduction Steps

1. Open `https://secretswingerlust.com/en/profile/Eldorado` (or a local profile whose owner is not age verified).
2. Look at the two central partner photo cards.

**Expected behavior:** Cards stay blurred. The ghost/mask and the "This profile is not age verified" card text are gone.
**Actual behavior:** Each card still shows the ghost icon and 18? on top of the blur.

## Evidence

User screenshot of `/en/profile/Eldorado` with the ghost on both partner cards and the banner "This profile is not age verified."

## Tracing Evidence

Jaeger is not applicable. This is a frontend overlay with no backend span.

## PostHog Evidence

No session recording or error-tracking link was provided. This is a requested UI change, not a runtime exception.

## Root Cause Analysis

`AgeVerifyOverlay` always rendered the ghost SVG. Profile partner cards call it with `showBanner`. Gallery cards used the same overlay until it was removed from `card-gallery.tsx` only.

**Related files:**
- [age-verify-overlay.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/age-verify-overlay.tsx)
- [profile.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/profile/(components)/profile.tsx)

## Fix Applied

Stop mounting `AgeVerifyOverlay` on profile partner cards. The overlay no longer renders the ghost SVG or the banner text for visitors. Thumbnail blur is unchanged. The header notice is unchanged.

## Unit / Regression Test

- **Test File:** [age-verify-overlay.test.unit.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/age-verify-overlay.test.unit.tsx)
- **Command:** `pnpm --prefix ssl-fe-user test:unit`
- **Test Results:** Overlay unit tests assert the ghost SVG is absent and the banner remains. E2E covers the same profile-card overlay.

## Lessons Learned

Profile partner cards and gallery tiles share the overlay component, not `CardGallery`. Removing the icon from one call site is not enough.

## References

- Related change: gallery-card overlay removal in `card-gallery.tsx`
