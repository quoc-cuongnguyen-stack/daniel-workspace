# BUG-131: Lightbox Encoding video poll spammed getModerationMedias

> **Status:** ✅ Fixed  
> **Date Found:** 2026-08-29  
> **Date Fixed:** 2026-08-29  
> **Project:** SSL  
> **Severity:** 🟠 High

---

## Description

Opening a newly uploaded community video showed **Encoding video…** and Network flooded with continuous `getModerationMedias` calls.

## Root Cause Analysis

BUG-129 gated the lightbox on `streamReady === false` and polled `GetCommunityMedia`. Parents passed `onRefetchMedia={() => refetchMedia()}`, so the poll `useEffect` restarted on every render and called the API immediately again (far denser than the intended 3s interval).

Product decision: **remove polling entirely** and mount the Bunny embed immediately.

## Fix Applied

- Removed the encoding poll `useEffect` and `onRefetchMedia` prop from `community-media-lightbox.tsx` and feed/gallery/moderator call sites.
- Lightbox always iframes `iframe.mediadelivery.net` embeds (no Encoding gate).

## References

- Related: BUG-129
