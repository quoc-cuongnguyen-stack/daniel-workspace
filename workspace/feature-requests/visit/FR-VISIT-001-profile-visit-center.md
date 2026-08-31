---
id: FR-VISIT-001
title: "Profile Visit Center - who-viewed-me with freemium teaser, incognito and reciprocity"
module: VISIT
priority: MUST
status: ready_to_implement
verify: T
phase: R1
milestone: "Release 1 - quick wins"
slice: 1
owner: Stephen Cheng
created: 2026-06-29
shipped: null
related_frs: [FR-AGEV-001]
depends_on: []
blocks: []
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P3 Profile Visit Notification Center"
  - "docs/SSL_NewFeatures_Proposal_Quotation_L4.docx#P4"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Profile Visit Center"
source_decisions:
  - DEC-SSL-201 (freemium teaser, not a hard gate - non-payers see that a visit happened with name/photo blurred; clicking opens upgrade CTA; payers see full info)
  - DEC-SSL-202 (a visit counts only when the full profile is opened, not from map pins or search cards)
  - DEC-SSL-203 (visitor records are stored for 30 days)
  - DEC-SSL-204 (incognito browsing with reciprocity - hide your visits, lose the ability to see who visited you)
  - DEC-SSL-205 (the unread badge clears when the center is opened; per-entry read state is retained)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-be/src/modules/profile-visit/profile-visit.model.ts
  - ssl-be/src/modules/profile-visit/profile-visit.controller.ts
  - ssl-be/src/modules/profile-visit/profile-visit.resolver.ts
  - ssl-be/src/modules/profile-visit/profile-visit.type.ts
  - ssl-be/src/modules/profile-visit/profile-visit.test.ts
  - ssl-fe-user/src/app/[locale]/(main)/visitors/page.tsx
  - ssl-fe-user/src/modules/visitor/visitor-list.tsx
  - ssl-fe-user/src/modules/visitor/visitor.hook.tsx
  - ssl-fe-user/src/modules/visitor/incognito-toggle.tsx
  - ssl-fe-user/src/modules/visitor/visitor.test.tsx
modified_files:
  - ssl-be/src/modules/user/user.validate.ts
  - ssl-fe-user/src/shared/layout/main/header.tsx
  - ssl-fe-user/src/shared/util/profile.ts
allowed_tools:
  - file_read: "ssl-be/src/**, ssl-fe-user/src/**"
  - file_write: "ssl-be/src/modules/profile-visit/**, ssl-fe-user/src/modules/visitor/**, ssl-fe-user/src/app/[locale]/(main)/visitors/**"
  - bash: cd ssl-be && pnpm vitest run profile-visit
disallowed_tools:
  - return clear visitor identity (name/photo) to a non-paying profile owner (per DEC-SSL-201)
  - record a visit from a map pin, search card, or preview (per DEC-SSL-202)
  - show who visited an incognito viewer while they remain incognito (per DEC-SSL-204)
effort_hours: 20
sub_tasks:
  - "4.0h: profile-visit.model.ts - ProfileVisit schema, unique (visitorId, profileOwnerId), TTL on expiresAt (DEC-SSL-203)"
  - "4.0h: profile-visit.controller.ts - recordVisit upsert + guards (self/blocked/suspended/deleted, incognito), unread count, delete one/all"
  - "3.0h: profile-visit.resolver.ts + .type.ts - GraphQL ops; paid/free hydration via hydrateUserMedia; reciprocity check"
  - "2.0h: Notification reuse - emit NEW_PROFILE_VISIT in-app line on a new (not deduped) visit"
  - "3.0h: ssl-fe-user visitor-list.tsx + visitor.hook.tsx + visitors/page.tsx - list, relative time, type filter, blur-click -> MembershipPopup"
  - "2.0h: header.tsx eye icon + unread badge (badge clears on open) + incognito-toggle.tsx + profile.ts helper"
  - "2.0h: profile-visit.test.ts + visitor.test.tsx - dedupe, TTL, full-profile-only, paid/free, incognito, delete one/all"
risk_if_skipped: "The Profile Visit Center is a Release 1 quick win (questionnaire P3) and the headline upsell surface: a non-paying owner who sees that someone visited is the platform's strongest reason to upgrade (DEC-SSL-201). Without the server-side teaser gate, a non-payer could read visitor identity straight off the API and the upsell collapses. Without the (visitorId, profileOwnerId) dedupe, a frequent viewer floods the list. Without the 30-day TTL (DEC-SSL-203), the collection grows without bound and stale visitors mislead the owner. Without incognito reciprocity (DEC-SSL-204) the privacy promise is one-sided. This FR is the whole feature, not an enhancement to an existing one."
---

## §1 - Description (BCP-14 normative)

The Profile Visit Center records who opened a member's full profile, surfaces it as a who-viewed-me list with an unread badge, and enforces a freemium teaser, incognito reciprocity, and a 30-day retention window. The contract:

1. The backend **MUST** record a profile visit only when a viewer opens the full profile, and **MUST NOT** record one from a map pin, a search result, or a preview card (DEC-SSL-202). Recording is triggered by the `recordProfileVisit` mutation called from the full-profile route, never from list or map views.
2. `recordProfileVisit` **MUST** deduplicate per visitor: at most one `ProfileVisit` document exists per `(visitorId, profileOwnerId)` pair, and a repeat visit **MUST** update `lastVisitedAt` (and refresh `expiresAt`) on the existing document rather than insert a second (an upsert).
3. Each `ProfileVisit` document **MUST** expire 30 days after `lastVisitedAt` via a MongoDB TTL index on `expiresAt`, so visitor history is automatically pruned (DEC-SSL-203).
4. `recordProfileVisit` **MUST NOT** create a document when the owner is blocked-by or has blocked the viewer, when either account is suspended or deleted, and **MUST NOT** record a self-visit (`visitorId === profileOwnerId`); these cases return success with no write.
5. The header **MUST** show an eye icon with an unread-visitor badge whose count clears when the center is opened, while per-entry `readAt` state is retained so individual entries can still render as seen or new (DEC-SSL-205).
6. The visitor list **MUST** show each visitor once with a thumbnail, a profile-type icon (single or couple), and a relative time (for example "2 hours ago"), ordered by `lastVisitedAt` descending (newest first).
7. The teaser **MUST** be applied: a non-paying owner sees that a visit happened but the visitor's name and photo are blurred, and clicking a blurred visitor opens the upgrade CTA (`MembershipPopup`); a paying owner sees full visitor info (DEC-SSL-201). The gate **MUST** be enforced server-side - `profileVisitors` **MUST NOT** return clear visitor identity to a non-paying owner - not merely hidden in the UI.
8. Incognito browsing **MUST** carry reciprocity: while a user is incognito their visit generates no visible entry for the owner, and while incognito they **MUST NOT** be able to read who visited them; `profileVisitors` returns an empty page (or an `incognitoActive` flag) for an incognito caller (DEC-SSL-204).
9. The owner **MUST** be able to delete a single visit or all visits, and a deleted visitor **MUST** reappear as a new entry on a later visit (delete removes the document; a future visit upserts a fresh one).
10. The list **MUST** offer a filter by profile type (single or couple), and the selected filter **MUST** be remembered across reopen (persisted client-side per user).
11. The backend **MUST** expose GraphQL operations - `recordProfileVisit`, `profileVisitors(filter, page)`, `unreadVisitorCount`, `deleteVisit`, `deleteAllVisits`, `setIncognito` - and a new visit (one that inserts, not one that only dedupes) **MUST** emit an audit line and an optional in-app notification reusing `NotificationModel` with a `NEW_PROFILE_VISIT` type.
12. The list rendering **SHOULD** reuse the existing media hydration and blur path (`signProfileImage` / `hydrateUserMedia` in `user.validate.ts`) so a blurred visitor thumbnail is produced the same way as every other blurred image on the platform (Bunny `class=blur`), rather than a bespoke blur.

---

## §2 - Why this design

Why full-profile-only recording (§1 #1, DEC-SSL-202)? A visit must mean intent. Counting map-pin hovers or search-card impressions would inflate the list with passers-by and make the upsell feel like noise. Firing `recordProfileVisit` from the full-profile route, and nowhere else, keeps the signal honest.

Why upsert-and-dedupe (§1 #2)? Who-viewed-me is a set of people, not a log of page loads. One document per `(visitorId, profileOwnerId)` with a moving `lastVisitedAt` shows each admirer once and keeps the newest-first order meaningful. The unique compound index makes the dedupe a property of the data, not of careful application code.

Why a 30-day TTL (§1 #3, DEC-SSL-203)? The client chose a 30-day window. A MongoDB TTL index on `expiresAt` enforces it without a cron job, mirroring the existing pattern in `message.model.ts` (`expireAfterSeconds: 0` with a partial filter on `expiresAt`). Refreshing `expiresAt` on each visit means an active admirer stays in the list; a one-off drops off after 30 days.

Why a server-side teaser, not a UI blur (§1 #7, #12, DEC-SSL-201)? The whole point of the feature is to make a non-payer want to pay. If the API returned the clear name and photo and the client merely blurred them, anyone reading the network response would defeat the upsell and leak identity. So `profileVisitors` resolves the viewer's paid status with `authnCtr.isPaidMember(context)` and, for a non-payer, runs each visitor through `hydrateUserMedia` with `viewerIsPaidMember: false` (producing the same Bunny `class=blur` signed URL as every other blurred image) and strips the clear username before returning. Reusing `signProfileImage` means the teaser cannot drift from the rest of the platform.

Why reciprocity for incognito (§1 #8, DEC-SSL-204)? Incognito is a fair trade, not a free pass: if you hide your footprints you also give up the right to see other people's. Enforcing it on the read side (an incognito caller gets an empty page) keeps the bargain symmetric and is the rule the client signed off.

Why reuse the Notification model (§1 #11)? The platform already has a notification surface (the bell, counters, `NotificationModel`). A new visit should ride that rail - a `NEW_PROFILE_VISIT` notification with the actor and a redirect to the visitors page - rather than invent a parallel channel. Only an inserting visit notifies, so a repeat viewer does not spam the owner.

---

## §3 - API contract

```typescript
// ssl-be/src/modules/profile-visit/profile-visit.model.ts
import { mongo } from '@cyberskill/shared/node/mongo';
import mongoose from 'mongoose';

import type { I_ProfileVisit } from './profile-visit.type.js';

import { E_VisitorProfileType } from './profile-visit.type.js';

export const ProfileVisitModel = mongo.createModel<I_ProfileVisit>({
    mongoose,
    name: 'ProfileVisit',
    schema: {
        visitorId: { type: String, required: true },
        profileOwnerId: { type: String, required: true },
        visitorProfileType: { type: String, enum: Object.values(E_VisitorProfileType) },
        lastVisitedAt: { type: Date, required: true, default: () => new Date() },
        readAt: { type: Date },                 // §1 #5 per-entry read state, retained
        expiresAt: { type: Date, required: true }, // §1 #3 set to lastVisitedAt + 30d
    },
    virtuals: [
        { name: 'visitor', options: { ref: 'User', localField: 'visitorId', foreignField: 'id', justOne: true } },
    ],
});

// §1 #2 one document per (visitor, owner) - dedupe is a data invariant
ProfileVisitModel.schema.index(
    { profileOwnerId: 1, visitorId: 1 },
    { unique: true, name: 'uniq_profile_visit_pair' },
);
// newest-first list scan for an owner (§1 #6)
ProfileVisitModel.schema.index(
    { profileOwnerId: 1, lastVisitedAt: -1 },
    { name: 'idx_profile_visit_owner_recent' },
);
// §1 #3 TTL - prune 30 days after the last visit (mirrors message.model.ts)
ProfileVisitModel.schema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'ttl_profile_visit_expires' },
);
```

```typescript
// ssl-be/src/modules/profile-visit/profile-visit.resolver.ts
import type { I_Context } from '#shared/typescript/index.js';

import { authnCtr } from '#modules/authn/authn.controller.js';

import { profileVisitCtr } from './profile-visit.controller.js';

const RETENTION_DAYS = 30; // DEC-SSL-203

export const profileVisitResolver = {
    Mutation: {
        // §1 #1 called ONLY from the full-profile route
        recordProfileVisit: async (_p: unknown, { profileOwnerId }: { profileOwnerId: string }, ctx: I_Context) =>
            profileVisitCtr.recordVisit(ctx, profileOwnerId),       // §1 #2 #4 upsert + guards
        deleteVisit: async (_p: unknown, { visitorId }: { visitorId: string }, ctx: I_Context) =>
            profileVisitCtr.deleteOne(ctx, visitorId),              // §1 #9
        deleteAllVisits: async (_p: unknown, _a: unknown, ctx: I_Context) =>
            profileVisitCtr.deleteAll(ctx),                         // §1 #9
        setIncognito: async (_p: unknown, { incognito }: { incognito: boolean }, ctx: I_Context) =>
            profileVisitCtr.setIncognito(ctx, incognito),          // §1 #8
    },
    Query: {
        // §1 #6 #7 #8 paged, newest-first, teaser + reciprocity applied inside the controller
        profileVisitors: async (_p: unknown, args: { filter?: { profileType?: string }; page?: { skip?: number; limit?: number } }, ctx: I_Context) =>
            profileVisitCtr.listVisitors(ctx, args.filter, args.page),
        unreadVisitorCount: async (_p: unknown, _a: unknown, ctx: I_Context) =>
            profileVisitCtr.unreadCount(ctx),                      // §1 #5 feeds the eye badge
    },
};
```

```typescript
// ssl-be/src/modules/profile-visit/profile-visit.controller.ts (shapes)
recordVisit(ctx, ownerId): Promise<{ success: boolean }>;   // self/blocked/suspended/incognito -> success, no write (§1 #4)
listVisitors(ctx, filter?, page?): Promise<I_VisitorPage>;  // incognito caller -> empty + incognitoActive (§1 #8)
unreadCount(ctx): Promise<number>;                          // count where readAt == null (§1 #5)
deleteOne(ctx, visitorId): Promise<{ success: boolean }>;   // §1 #9
deleteAll(ctx): Promise<{ success: boolean }>;              // §1 #9
setIncognito(ctx, incognito): Promise<{ success: boolean }>;// §1 #8
```

Inside `listVisitors`, the teaser is server-side: `const isPaid = await authnCtr.isPaidMember(ctx)`; for `!isPaid`, each visitor is hydrated through `hydrateUserMedia(visitor, { ...getViewerMediaContext(owner).mediaOptions, viewerIsPaidMember: false })` (blurred thumbnail) and the clear `username` is replaced with a masked placeholder before return (§1 #7, #12).

---

## §4 - Acceptance criteria

1. Full-profile-only - calling `recordProfileVisit(ownerId)` from the full-profile route inserts one document; no document is created by map-pin or search-card code paths (§1 #1). Test: `records_only_on_full_profile_open`.
2. Dedupe upsert - two visits by the same viewer to the same owner leave exactly one document, with `lastVisitedAt` advanced to the later visit (§1 #2). Test: `dedupes_and_updates_last_visited`.
3. TTL field - a recorded visit sets `expiresAt = lastVisitedAt + 30d`, and a repeat visit refreshes it; the schema carries the `ttl_profile_visit_expires` index with `expireAfterSeconds: 0` (§1 #3). Test: `sets_and_refreshes_ttl_expiry`.
4. No self / blocked / suspended - `recordProfileVisit` with `visitorId === profileOwnerId`, or with a blocked or suspended counterpart, returns success and writes nothing (§1 #4). Test: `skips_self_blocked_suspended`.
5. Unread badge clears, read state kept - `unreadVisitorCount` is the count of entries with `readAt == null`; opening the center marks the page read so the count drops to 0, while individual `readAt` timestamps remain set (§1 #5). Tests: `unread_count_reflects_readAt` and fe `clears_unread_badge_on_open`.
6. List shape and order - `profileVisitors` returns each visitor once with thumbnail, profile-type icon, and a `lastVisitedAt` usable for relative time, ordered newest-first (§1 #6). Test: `lists_each_visitor_once_newest_first`.
7. Free owner is blurred and gated server-side - for a non-paying owner, `profileVisitors` returns blurred thumbnails produced by the shared `hydrateUserMedia` path (Bunny `class=blur`) and no clear username; clicking a blurred visitor on the client opens `MembershipPopup` (§1 #7, #12). Tests: `free_owner_gets_blurred_no_clear_identity` and fe `blurred_visitor_click_opens_membership_popup`.
8. Paid owner sees full info - for a paying owner (`authnCtr.isPaidMember` true), `profileVisitors` returns clear thumbnails and usernames (§1 #7). Test: `paid_owner_gets_clear_identity`.
9. Incognito reciprocity - while incognito a viewer creates no visible entry, and `profileVisitors` for that incognito caller returns an empty page with `incognitoActive: true` (§1 #8). Test: `incognito_hides_and_reciprocally_blocks`.
10. Delete one and all, reappear - `deleteVisit` removes a single entry and `deleteAllVisits` empties the list; a subsequent visit by a deleted visitor upserts a fresh entry (§1 #9). Test: `delete_one_all_and_reappear`.
11. Remembered type filter - `profileVisitors({ profileType: COUPLE })` returns only couple visitors; the client persists the last-used filter across reopen (§1 #10). Tests: `filters_by_profile_type` and fe `remembers_last_filter`.
12. GraphQL surface and notification - the five operations resolve, and an inserting (non-deduped) visit emits an audit line plus a `NEW_PROFILE_VISIT` `NotificationModel` row, while a deduped repeat visit emits no new notification (§1 #11). Test: `notifies_only_on_first_visit`.

---

## §5 - Verification

```typescript
// ssl-be/src/modules/profile-visit/profile-visit.test.ts (Vitest, mirrors location.controller.test.ts)
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { profileVisitCtr } from './profile-visit.controller.js';
import { ProfileVisitModel } from './profile-visit.model.js';
import { E_VisitorProfileType } from './profile-visit.type.js';

describe('profileVisitCtr', () => {
    beforeEach(() => { vi.clearAllMocks(); /* in-memory Mongo / model mocks */ });

    it('records_only_on_full_profile_open', async () => { /* AC1 - recordVisit inserts; map/search paths never call it */ });
    it('dedupes_and_updates_last_visited', async () => { /* AC2 - two visits -> 1 doc, lastVisitedAt advances */ });
    it('sets_and_refreshes_ttl_expiry', async () => { /* AC3 - expiresAt == lastVisitedAt + 30d; refresh on repeat */ });
    it('skips_self_blocked_suspended', async () => { /* AC4 - self/blocked/suspended -> success, 0 writes */ });
    it('unread_count_reflects_readAt', async () => { /* AC5 - count of readAt==null; markRead -> 0; readAt kept */ });
    it('lists_each_visitor_once_newest_first', async () => { /* AC6 - one row/visitor, sorted lastVisitedAt desc */ });
    it('free_owner_gets_blurred_no_clear_identity', async () => { /* AC7 - class=blur thumbs, username masked */ });
    it('paid_owner_gets_clear_identity', async () => { /* AC8 - isPaidMember true -> clear thumbs + usernames */ });
    it('incognito_hides_and_reciprocally_blocks', async () => { /* AC9 - no entry written; caller list empty + incognitoActive */ });
    it('delete_one_all_and_reappear', async () => { /* AC10 - deleteOne/deleteAll; later visit re-upserts */ });
    it('filters_by_profile_type', async () => { /* AC11 - profileType=COUPLE returns only couples */ });
    it('notifies_only_on_first_visit', async () => { /* AC12 - insert -> NEW_PROFILE_VISIT row; dedupe -> none */ });
});
```

```typescript
// ssl-fe-user/src/modules/visitor/visitor.test.tsx (Vitest + Testing Library)
import { describe, expect, it } from 'vitest';

describe('VisitorList', () => {
    it('clears_unread_badge_on_open', async () => { /* AC5 - eye badge -> 0 after opening visitors page */ });
    it('blurred_visitor_click_opens_membership_popup', async () => { /* AC7 - non-payer click -> MembershipPopup mounts */ });
    it('remembers_last_filter', async () => { /* AC11 - reopened list restores the last profileType filter */ });
});
```

Run: `cd ssl-be && pnpm vitest run profile-visit` and `cd ssl-fe-user && pnpm vitest run visitor`. Both test files are listed in frontmatter `new_files`; they are co-located with the module exactly as `location.controller.test.ts` is.

---

## §6 - Implementation skeleton

The §3 model, resolver, and controller shapes are the skeleton. The controller carries the three cross-cutting concerns:

- Recording (`recordVisit`): guard self/blocked/suspended/incognito (§1 #4, #8) -> upsert by `(profileOwnerId, visitorId)` setting `lastVisitedAt` and `expiresAt = now + 30d` (§1 #2, #3) -> on insert only, emit audit + `NEW_PROFILE_VISIT` notification via `NotificationModel` (§1 #11).
- Reading (`listVisitors`): if the caller is incognito, return empty + `incognitoActive` (§1 #8); else page by `{ profileOwnerId }` sorted `lastVisitedAt: -1` with the optional `profileType` filter (§1 #6, #10); resolve `isPaid = await authnCtr.isPaidMember(ctx)` and, when false, blur thumbnails through `hydrateUserMedia(..., { viewerIsPaidMember: false })` and mask usernames (§1 #7, #12).
- Counting (`unreadCount`): count `{ profileOwnerId, readAt: null }`; opening the center bulk-sets `readAt` for the returned page so the badge clears while per-entry state persists (§1 #5).

Frontend: `header.tsx` gains an eye `Button` with an unread badge fed by `unreadVisitorCount` (alongside the existing `Bell` / `Mail`); `visitors/page.tsx` renders `visitor-list.tsx`, which uses `visitor.hook.tsx` for the paged query and `formatDistanceToNow` from `date-fns` for relative time, opens `MembershipPopup` on a blurred-visitor click, and hosts `incognito-toggle.tsx`. `profile.ts` gains an `isIncognitoActive` / `maskVisitorName` helper paralleling `isMemberShip`.

---

## §7 - Dependencies

- Upstream: none (no FR blocks this; `depends_on: []`).
- Reused backend: `authnCtr.isPaidMember(context)` (`authn.controller.ts`) for the server-side gate; `signProfileImage` / `hydrateUserMedia` / `getViewerMediaContext` (`user.validate.ts`) for blur via Bunny `class=blur`; `NotificationModel` (`notification.model.ts`) for the `NEW_PROFILE_VISIT` line; the `mongo.createModel` / TTL index idiom from `message.model.ts`.
- Reused frontend: `MembershipPopup` (`membership-popup.tsx`) for the upgrade CTA; `isMemberShip` / `isFreeMember` (`profile.ts`); the header icon + badge pattern (`Bell` / `Mail` in `header.tsx`); `Modal` / `Tab` in `#shared/component/ui`; `formatDistanceToNow` (`date-fns`).
- Related: **FR-AGEV-001** (age-verify overlay) shares the same blur path; a visitor thumbnail of a not-age-verified profile already blurs through `signProfileImage`, so the two features must not double-blur.
- Downstream: none in Release 1.

---

## §8 - Example payloads

```json
{ "data": { "recordProfileVisit": { "success": true } } }
```

```json
{
  "data": {
    "profileVisitors": {
      "incognitoActive": false,
      "items": [
        { "visitorId": "u_882", "username": "AnnaAndTom", "visitorProfileType": "COUPLE",
          "thumbnailUrl": "https://cdn.bunny.net/u_882.webp?class=normal&token=...", "lastVisitedAt": "2026-06-29T10:12:04Z", "readAt": null }
      ],
      "total": 1
    }
  }
}
```

```json
{
  "data": {
    "profileVisitors": {
      "incognitoActive": false,
      "items": [
        { "visitorId": "u_882", "username": "Member", "visitorProfileType": "COUPLE",
          "thumbnailUrl": "https://cdn.bunny.net/u_882.webp?class=blur&token=...", "lastVisitedAt": "2026-06-29T10:12:04Z", "readAt": null }
      ],
      "total": 1
    }
  }
}
```

```json
{ "type": ["NEW_PROFILE_VISIT"], "actorId": "u_882", "targetId": "u_401",
  "presentation": { "headline": "Someone viewed your profile", "redirect": { "kind": "INTERNAL", "url": "/visitors" } } }
```

---

## §9 - Open questions

All client-facing points are decided (DEC-SSL-201..205). Deferred or noted:

- Masked-name copy for a blurred visitor ("Member", "A swinger near you", or a localized string) - wording is a content decision; the placeholder key ships and the client supplies translations.
- Whether `setIncognito` is per-session or a sticky account setting - default to a sticky account flag; revisit if the client wants a per-visit toggle.
- Whether to also notify by email channel - the FR ships in-app only (`E_NotificationChannel.IN_APP`); email is a later opt-in via the existing notification settings.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Visit recorded from a map pin or search card | recordProfileVisit called only from full-profile route | no write | none (AC1) |
| Duplicate rows for one admirer | unique (profileOwnerId, visitorId) + upsert | single row, lastVisitedAt advanced | none (AC2) |
| History grows without bound | TTL on expiresAt (expireAfterSeconds: 0) | pruned 30d after last visit | none (AC3) |
| Self-visit inflates the list | visitorId === profileOwnerId guard | success, no write | none (AC4) |
| Visit between blocked/suspended users | block/suspension guard | success, no write | none (AC4) |
| Clear identity leaked to a non-payer | server-side gate (isPaidMember) before return | blurred thumb + masked name | upgrade to reveal (AC7) |
| UI-only blur bypassed via network tab | identity stripped server-side, not in client | nothing to reveal | none (AC7) |
| Incognito user still sees their visitors | reciprocity check on listVisitors | empty page + incognitoActive | turn incognito off (AC9) |
| Badge stuck after opening center | markRead on returned page | unread count -> 0 | reopen (AC5) |
| Per-entry seen state lost on badge clear | readAt retained per row | individual state intact | none (AC5) |
| Deleted visitor never returns | delete removes doc; visit re-upserts | reappears as new entry | none (AC10) |
| Filter resets every open | filter persisted client-side | last filter restored | none (AC11) |
| Repeat visit spams notifications | notify on insert only | one notification per new admirer | none (AC12) |
| Double-blur with age-verify overlay | single shared signProfileImage path | one blur applied | none (FR-AGEV-001) |

---

## §11 - Implementation notes

- The dedupe and the 30-day window are both data invariants, not application logic: the unique `(profileOwnerId, visitorId)` index makes a second row impossible, and the `expireAfterSeconds: 0` TTL on `expiresAt` (the same idiom `message.model.ts` already uses) makes the 30-day prune automatic. `recordVisit` only has to set `lastVisitedAt` and `expiresAt = now + 30d` on upsert.
- The teaser is enforced where the data leaves the server. `listVisitors` resolves `authnCtr.isPaidMember(ctx)` and, for a non-payer, runs each visitor through `hydrateUserMedia` with `viewerIsPaidMember: false` (producing a Bunny `class=blur` URL exactly like the rest of the platform) and masks the username before returning. The client blur is cosmetic; the API never carries clear identity to a non-payer, so the network tab reveals nothing.
- Incognito is enforced on both sides from one flag. Recording skips writing for an incognito viewer, and reading returns an empty page with `incognitoActive` for an incognito caller, so the reciprocity in DEC-SSL-204 cannot be half-applied.
- The unread badge and per-entry read state are deliberately separate: the badge is the count of `readAt == null`, cleared by bulk-stamping `readAt` on the opened page, while each row keeps its own `readAt` so a returning owner still sees which specific admirers are new (DEC-SSL-205).
- Notifications ride the existing rail. A new visit inserts a `NEW_PROFILE_VISIT` `NotificationModel` row (actor = visitor, redirect = `/visitors`) and emits an audit line; a deduped repeat visit does neither, so an active admirer does not flood the owner's bell.
- The visitor thumbnail and a not-age-verified overlay (FR-AGEV-001) share `signProfileImage`, so a visitor whose own profile is unverified is blurred once by the existing rule, never twice.

---

*End of FR-VISIT-001.*
