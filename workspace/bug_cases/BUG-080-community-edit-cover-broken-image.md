# BUG-080: Community cover broken when reopening Edit Community

> **Status:** ✅ Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL
> **Severity:** 🟠 High

---

## Description

C-952: after a community cover image saved successfully, reopening Edit Community at `/fr/communities/create?edit=...` showed a broken image icon on a black frame instead of the uploaded cover.

## Reproduction steps

1. Create or edit a community and upload a Community Cover Image.
2. Save. The upload and community write succeed.
3. Open Edit Community again (`/fr/communities/create?edit=<id>`).
4. Go to the Design step.

**Expected behavior:** The saved cover loads in the header preview.
**Actual behavior:** The preview frame is black with a broken-image icon in the corner.

## Evidence

Superthread C-952 screenshot: black cover frame, broken image icon, Replace / Remove still shown (so `coverImage` was truthy but not loadable).

## Tracing evidence

Jaeger was not required. The write path stored a Bunny URL; the read path returned that raw string without a token.

## PostHog evidence

C-952 had no PostHog session or error link.

## Root cause analysis

Upload stores `coverImage` as `${BUNNY_CDN_HOSTNAME}/${path}` (often with `?class=blur`). Gallery and post media go through `getModerationMedias`, which re-signs URLs with `class=normal`. Community get/list/update left `coverImage` unsigned.

The edit wizard hydrates `form.coverImage` from that field and StepDesign uses `<img src={previewUrl}>`. Bunny token auth rejects the unsigned URL (403). CSS `background-image` on the community page fails silently; `<img>` shows the broken icon.

Pending covers stay visible (C-950 / BUG-079). This bug is the missing signature, not the hide filter.

**Related files:**
- [community.service.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.ts)
- [community.util.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.util.ts)
- [page.client.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/app/[locale]/(blank)/(communities)/communities/create/page.client.tsx)
- [step-design.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/create-wizard/step-design.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)

## Fix applied

On community get/list/update, after the reject-only hide, replace cover/logo with the signed moderation-media URL when present (`headerImageId` / `logoMediaId`), otherwise sign the stored path (`class=normal`, 24h). Create now signs even when those media ids were not written, so the first response is loadable without a refresh. GetCommunity uses cache-and-network so a stale unsigned cache entry is replaced. The edit wizard only uses `http(s)` / `blob:` / `data:image` values as `<img src>`.

## Unit / regression test

- [community.service.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.service.test.ts)
- [community.util.test.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-be/src/modules/community/community.util.test.ts)
- [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)

## Lessons learned

Stored Bunny paths are not browser-ready. Any `<img>` that reads `coverImage` needs the same signing path as moderation media.

## References

- Superthread: [C-952](https://app.superthread.com/cnlgaming/card-952-bug-uploaded-cover-image-saved-successfully-but-displays-broken-image-when-re-editing-community)
- Related: [BUG-079](BUG-079-community-cover-sidebar-placeholder.md)
