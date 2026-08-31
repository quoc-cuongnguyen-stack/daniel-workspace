# BUG-137 analysis

## Symptom
Community banner/logo JPEG crop often needed several Save/submit attempts.

## Cause
Save ran before decode; huge canvases made `toBlob` return null; JPEG fast-path accepted 0×0 images; submit continued without a CDN URL.

## Fix
- Gate Save on positive decode + non-zero crop; toast crop failures.
- Cap export long edge at 4096; require positive JPEG dimensions on the fast path.
- 20 MB wizard limit; require banner + logo; abort mutation when upload returns no URL.
