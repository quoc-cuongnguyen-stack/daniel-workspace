# BUG-923: Image upload frozen due to unnecessary JPEG re-encoding & concurrent conversion UI bugs

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-06
> **Date Fixed:** 2026-08-06
> **Project:** SSL
> **Severity:** 🟠 High

---

## 🔍 Description

Users reported a massive UI freeze (up to 50 seconds) when uploading multiple images simultaneously in the `upload-media.tsx` modal. The application became completely unresponsive, and due to the lack of an immediate "Processing" state lock, users could click "Select files" or trigger drop events repeatedly, stacking duplicate conversions. Additionally, clicking the "delete" button for a single image during or after the freeze cleared the entire upload queue unintentionally.

## 🔄 Reproduction Steps

1. Open the upload media modal in the profile gallery.
2. Select or drop 5 high-resolution JPEG files (e.g. 5-10MB each).
3. Observe the browser UI freezing heavily for several tens of seconds.
4. Try to click "Publish" or "Select files" while frozen; they remain active but don't respond until the freeze clears, stacking actions.
5. Once images appear in the preview list, click the trash can icon on one image.

**Expected behavior:** The 5 JPEGs upload quickly since they don't need format changes. Removing one image only removes that specific image. The UI immediately shows a "Processing..." state upon selection.
**Actual behavior:** The browser thread is blocked for up to a minute by heavy canvas operations and WASM execution. Duplicate processing happens if the user spams selection. Removing one image clears the entire state array.

## 📸 Evidence

- Users reported complete UI hangs lasting around ~50 seconds per 5 images.
- PostHog session recordings showed users confused by the lack of loading state and clicking repeatedly on "Publish" and "Select files".
- PostHog logs confirmed the bottleneck was strictly frontend (no backend latency or timeouts).

## 🔭 Tracing Evidence

N/A - The issue was purely frontend synchronous processing.

## 📊 PostHog Evidence

**Session Recording:** Analyzed session recording from the user ticket showing multi-click spam during freezes.
**Event Data:**
- No `$exception` events related to backend crashes were logged.
- The `MEDIA_UPLOADED` tracking event was reached, but only after the 50s client-side freeze.

## 🧠 Root Cause Analysis

1. **Heavy Canvas Manipulation for Native Formats**: In `src/shared/util/image-converter.ts`, all images were routed to `browser-image-compression`. This library decoded the image, resized it on a canvas to 4096px, and re-encoded it to a JPEG blob at 98% quality. For standard JPEGs that browsers already handle well, this was incredibly redundant and blocked the main thread.
2. **Missing UI State Locks**: In `src/shared/component/ui/upload-media.tsx`, the `handleSelectFiles` function did not use a locking mechanism (`isConverting` or a ref) to prevent concurrent executions.
3. **Improper State Mutation in `handleRemove`**: Deleting an item unintentionally fired `setFiles([])` due to a misplaced scope closure inside the previous state update callback.

**Related files:**
- [image-converter.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/util/image-converter.ts)
- [upload-media.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/ui/upload-media.tsx)

## 🔧 Fix Applied

- **Fast-path for Web Native Images**: Updated `convertToJpeg` to check the file MIME type and immediately return JPEGs under 4096px resolution without calling `browser-image-compression`.
- **Canvas Fallback for WebP/PNG**: For PNGs and WebPs, the code now executes a simple, native `canvas` transformation, entirely skipping the heavy WASM footprint of the compression library.
- **State Locks**: Added a `convertingRef` and `isConverting` state to `upload-media.tsx`. The input field and buttons are visually disabled, and multiple calls to `handleSelectFiles` are discarded if `convertingRef` is active.
- **`handleRemove` Scope Fix**: Corrected the logic in `handleRemove` to safely revoke the URL and filter the array without clearing it.

```diff
-        // Wait for dynamic import
-        const module = await import('browser-image-compression');
-        imageCompression = module.default;
+        const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
+        const isPngOrWebp = file.type === 'image/png' || file.type === 'image/webp';
+        
+        // Fast path for web-native formats
+        if (isJpeg || isPngOrWebp) {
+            // Returns unmodified file if within dimension limits
```

## 🧪 Unit / Regression Test

- **Test File:** Unit tests successfully passed (87 tests) via `pnpm test:unit`.
- **Linting:** Code formatting issues resolved via `pnpm lint:fix`.

## 📝 Lessons Learned

- Always check if the browser can handle an image natively before relying on third-party canvas or WASM compression libraries.
- For blocking client-side tasks, always apply an immediate React state lock or `useRef` lock to prevent user input spamming during the freeze.
- Never place full state wipes inside a `setFiles(prev => ...)` iterator without careful consideration.

## 🔗 References

- Knowledge items: [Image Upload Conversion Bottleneck & UI State Bug](file:///Users/daniel/.gemini/antigravity-ide/knowledge/image-upload-conversion-bottleneck-bug/metadata.json)
