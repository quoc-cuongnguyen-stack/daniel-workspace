# BUG-134: Banner cropper too narrow / white letterbox on zoom-out

> **Status:** ✅ Fixed (cover-safe zoom)
> **Date Found:** 2026-08-28 (Johni feedback) / 2026-08-30 (white border regression)
> **Date Fixed:** 2026-08-30
> **Project:** SSL / ssl-fe-user
> **Severity:** 🟡 Medium

---

## Description

The community banner crop UI felt too narrow: the initial selection was zoomed into the center (~80% of max fit), and users could not scale the image to fit the wide crop strip (`1456×265`).

After adding a CSS `transform: scale` zoom (0.5–3), zooming **out** shrunk the bitmap inside the crop frame and `drawCroppedImageToCanvas` filled the empty area with **white**. That white letterboxing was baked into the JPEG and showed on wizard preview and the saved feed cover — not a proper cover banner.

## Reproduction Steps

1. Create/edit a community → Design → upload a cover photo.
2. In the crop modal, drag Zoom toward **0.5x**.
3. Save and inspect the Design preview / community feed cover.

**Expected:** Image always covers the banner frame; no white bars; zoom 0.5–3 and reposition still work.
**Actual (regression):** Zoom-out left white gaps in the modal and in the saved image.

## Root Cause Analysis

1. Initial crop used a hard-coded **0.8** heuristic (felt permanently zoomed-in).
2. Zoom was implemented as CSS `scale()` on the `<img>`. Values `< 1` leave empty space inside the fixed crop rectangle.
3. Export used the react-image-crop sandbox pattern with **`fillStyle = '#FFFFFF'`**, so letterboxing became permanent pixels in the uploaded JPEG.
4. Preview/feed already used `object-cover` / `bg-cover`; they correctly showed the baked-in white edges.

## Fix Applied

- `getInitialAspectCrop` — max-fit (100%) cover crop.
- Zoom **0.5–3** drives **crop size**, not CSS shrink. Mapping is fully meaningful (no dead zone):
  - `zoomFactor = scale / 0.5` → **0.5x = max-fit**, **1.0x = 2×**, **3.0x = 6×**
  - Default slider = **0.5x** (most zoomed-out cover)
- `drawCroppedImageToCanvas` — direct source blit, **no white `fillRect`**; destination always fills the canvas.
- Wider modal stage for banner aspect (≥ 3).
- Wizard preview keeps `object-cover`; feed cover keeps `bg-cover`.

## Unit / Regression Test

- `image-cropper.util.test.unit.ts` — initial max-fit, distinct crops at 0.5/1.0/3.0, round-trip scale, export without `fillRect`
- `image-cropper-modal.test.unit.tsx` — default 0.5x, 0.5→1.0 shrinks (no dead zone), 3.0 shrinks further, save JPEG without white fill
- `community-cover-preview.test.unit.tsx` — Design preview `object-cover` + feed `bg-cover` for saved URL

## Lessons Learned

For cover/banner crops, zoom must never introduce empty pixels in the selection or the export. Prefer sizing the crop rectangle (cover-safe) over CSS-scaling the image below the frame; never letterbox with a fill color that gets encoded into the upload. Also avoid a slider dead zone (e.g. mapping all of `≤1` to the same crop) — every labeled zoom step should change the selection.

## References

- Johni / Superthread: banner crop too narrow; scaling down first; white border on cover
- `COMMUNITY_COVER_*` in `communities.type.ts`
