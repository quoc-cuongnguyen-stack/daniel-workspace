# Bug Case: CARD-932 White Avatar Crop Fallback

## Symptom
When the crop modal UI failed to render, had uninitialized crop dimensions (`completedCrop` is null or 0x0), or image loading was delayed, clicking Save produced a processed avatar image that turned completely solid white (`#FFFFFF`).

## Root Cause Analysis
1. `getCroppedImage` in `image-upload-watermark.tsx` initialized the canvas by painting a solid white background (`ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, CROP_WIDTH, CROP_HEIGHT)`) to prevent black backgrounds on transparent PNGs.
2. If `crop.width` or `crop.height` was 0, uninitialized, or `imgRef.current` was not attached, `ctx.drawImage` drew a 0x0 area onto the canvas, leaving the background 100% white (`#FFFFFF`).
3. `handleCropComplete` silently aborted or passed the 0-area white canvas output to `onChange`.

## Resolution
1. **Natural Image Bounds Fallback**: Updated `getCroppedImage` to check `hasValidCrop`. If crop dimensions are zero, null, or uninitialized, it falls back to drawing the full natural image (`sourceX = 0, sourceY = 0, sourceWidth = naturalWidth, sourceHeight = naturalHeight`).
2. **DOM Image Element Fallback**: Updated `handleCropComplete` so that if `imgRef.current` is not attached when submitted, it dynamically loads a temporary `Image()` object from `cropModal.imageUrl` and crops it safely using full natural bounds.
