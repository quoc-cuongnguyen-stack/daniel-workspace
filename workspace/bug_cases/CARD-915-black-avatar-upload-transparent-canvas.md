# Bug Case Analysis: Card-915 Black Avatar Upload Fix

## 1. Overview
- **Ticket ID:** Card-915
- **Reporter / Profile:** `JokerandHarleyNZ`
- **Symptom:** Avatar uploaded during registration flow turned completely black after upload.
- **Affected Components:**
  - `ssl-fe-user/src/shared/component/ui/image-upload-watermark.tsx` (`handleCropComplete`, `getCroppedImage`)
  - `ssl-fe-user/src/shared/util/image-converter.ts` (`convertViaCanvas`, `convertTiffViaUtif`)
  - `ssl-fe-user/src/shared/component/ui/image-cropper-modal.tsx` (`getCroppedImageUrl`)

## 2. Root Cause Analysis
Two distinct causes combined to produce the black image artifact:

1. **Secondary Async Re-encoding & `img.width` Zero-Dimension Bug**:
   - In `image-upload-watermark.tsx`, after `getCroppedImageUrl` generated the cropped Data URL (which rendered correctly in the preview modal as shown in the screenshot), `handleCropComplete` created an unattached `const img = document.createElement('img')` and set `img.src = dataUrl`.
   - `handleCropComplete` immediately closed the crop modal synchronously (`setCropModal({ isOpen: false })`).
   - In the asynchronous `img.onload` callback, it set `canvas.width = img.width` and `canvas.height = img.height`.
   - On an unattached `<img>` element unmounting with modal closure, `img.width` evaluated to `0`, causing the second canvas to resize to 0x0 pixels.
   - Re-encoding a 0x0 canvas via `canvas.toBlob` generated a 0-byte or corrupted black JPEG file, which was passed to `onChange(croppedFile)` and uploaded to the server.

2. **Transparent JPEG Canvas Fill Missing**:
   - When processing transparent PNG/WebP/HEIC/TIFF files, standard HTML5 Canvas contexts initialize with transparent black `rgba(0, 0, 0, 0)`.
   - Exporting to JPEG via `canvas.toBlob(..., 'image/jpeg')` dropped alpha channels without background fill, turning transparent pixels pitch black `rgb(0, 0, 0)`.

## 3. Resolution & Code Changes
1. **Refactored `image-upload-watermark.tsx`**:
   - Replaced redundant double-canvas conversion in `handleCropComplete` with a single, direct `getCroppedImage` call returning `{ blob, dataUrl }`.
   - Removed the second `HTMLImageElement` and second `canvas.toBlob` step entirely, eliminating the `img.width` zero-dimension bug and async unmount race condition.

2. **Solid White Background Fill**:
   - Added `ctx.fillStyle = '#FFFFFF'` and `ctx.fillRect(...)` prior to `ctx.drawImage` across `image-converter.ts`, `image-upload-watermark.tsx`, and `image-cropper-modal.tsx`.

3. **Unit Tests**:
   - Created `ssl-fe-user/src/shared/util/image-converter.test.unit.ts` verifying image conversion and file processing.

## 4. Verification
- `pnpm test:unit` passed all 115 unit tests across 18 test files.
- `pnpm lint` passed with 0 errors.
