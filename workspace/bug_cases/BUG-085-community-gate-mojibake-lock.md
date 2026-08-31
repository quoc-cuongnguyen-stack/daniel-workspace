# BUG-085: Members-only gate showed a garbled lock glyph

> **Status:** Fixed
> **Date Found:** 2026-08-17
> **Date Fixed:** 2026-08-17
> **Project:** SSL (ssl-fe-user)
> **Severity:** Low

## Description

A visitor of a public community saw `ðŸ”’` above "Members only" instead of a lock. The same Latin-1 mojibake appeared on comment emoji chips and video thumbnails.

## Reproduction steps

1. Log in as a user who is not a member of a public community.
2. Open `/communities/<slug>/feed`.

**Expected behavior:** A lock icon above "Members only".
**Actual behavior:** The characters `ðŸ”’` rendered as the icon.

## Evidence

Screenshot of the members-only card on "Community for TC-01 for user A". Source line:

```tsx
<p className="text-4xl mb-4">ðŸ”’</p>
```

`ðŸ”’` is UTF-8 for the lock emoji decoded as Windows-1252.

## Tracing evidence

Jaeger was not required. This is a frontend source-encoding defect.

## PostHog evidence

No Superthread or PostHog link was provided.

## Root cause analysis

A lock emoji was pasted into `community-access-gate.tsx` and the file (or a later save) treated those bytes as Latin-1. The same pattern existed in the lightbox comment emoji list and video badges.

**Related files:**
- [community-access-gate.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-access-gate.tsx)
- [communities.type.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.ts)
- [community-media-lightbox.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-media-lightbox.tsx)
- [community-post.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/shared/component/communities/community-post.tsx)

## Fix applied

The gate uses a Lucide `Lock` icon. Comment emojis and the video badge are Unicode escapes in `communities.type.ts`, so a Latin-1 save cannot corrupt them.

## Unit / Regression Test

- **Test File:** [communities.type.test.unit.ts](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/communities/communities.type.test.unit.ts)
- **Command:** `./node_modules/.bin/vitest run --config src/shared/vitest/vitest.config.unit.ts src/modules/communities/communities.type.test.unit.ts`
- **Test Results:** Comment emoji code points match the intended set, the video badge is U+1F3AC, and the access-gate source has no `ðŸ` lock glyph.

## Lessons Learned

Do not paste raw emoji into TSX. Use an SVG icon or a `\u{...}` escape.

## References

- Related bug cases: BUG-084
