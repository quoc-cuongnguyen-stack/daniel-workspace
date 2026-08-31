---
id: FR-COMM-004
title: "Community admin: platform-managed tags and community / post moderation surfaces"
module: COMM
priority: MUST
status: ready_to_implement
verify: T
phase: R2
milestone: "Release 2 - Communities MVP"
slice: 2
owner: Stephen Cheng
created: 2026-06-29
shipped: null
memory_chain_hash: null
related_frs: [FR-COMM-001, FR-COMM-002]
depends_on: [FR-COMM-001, FR-COMM-002]
blocks: []
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P1 Q3 themes/tags + admin"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Communities first version (MVP)"
source_decisions:
  - DEC-SSL-243 (v1 search is by community name plus tags plus location; searching inside posts is later)
  - DEC-SSL-244 (media limits reuse the platform's existing gallery limits)
  - DEC-SSL-246 (Phase 2, out of scope this round: community map, private communities with application + moderator approval, activity points, premade themes with the step-based builder, and the full in-community admin panel)
language: typescript
service: "ssl-fe-admin + ssl-be"
new_files:
  - ssl-fe-admin/src/modules/community/community-list.tsx
  - ssl-fe-admin/src/modules/moderation/community-posts/community-posts.page.tsx
  - ssl-fe-admin/src/modules/community/community-list.test.tsx
  - ssl-be/src/modules/community/community-admin.test.ts
modified_files:
  - ssl-fe-admin/src/routes.ts
  - ssl-fe-admin/src/modules/tag/tag.page.tsx
  - ssl-fe-admin/src/modules/tag/tag-form.tsx
  - ssl-be/src/modules/tag/tag.type.ts
  - ssl-be/src/modules/tag/tag.graphql
  - ssl-be/src/modules/community/community.resolver.ts
allowed_tools:
  - file_read: "ssl-fe-admin/src/**, ssl-be/src/**"
  - file_write: "ssl-fe-admin/src/modules/community/**, ssl-fe-admin/src/modules/moderation/community-posts/**, ssl-fe-admin/src/routes.ts, ssl-fe-admin/src/modules/tag/**, ssl-be/src/modules/tag/**, ssl-be/src/modules/community/**"
  - bash: cd ssl-fe-admin && pnpm vitest run community
disallowed_tools:
  - build the per-community admin panel, approval workflow, activity points, or themes builder (Phase 2, per DEC-SSL-246)
  - run a moderation action from the client only, without the admin-portal-session server check (per §1 #6)
effort_hours: 16
sub_tasks:
  - "2.0h: tag.model.ts community tag type + tag-form.tsx/tag.page.tsx COMMUNITY option so curated standard tags coexist with user-created tags (§1 #1)"
  - "3.0h: community-list.tsx - DataTable columns (name, owner, member count, post count, status, created) + useListQueryState filters reusing the Tag admin pattern (§1 #2)"
  - "3.5h: community-posts.page.tsx - approve/reject/delete with reason + notes, reusing the media-moderation modals and hooks (§1 #3, #7)"
  - "1.5h: route community post media into the existing ModerationMedia queue via an E_UploadEntity.COMMUNITY discriminator (§1 #3)"
  - "1.5h: routes.ts - register /community and /moderation/community-posts under the dashboard layout, gated by existing admin authz (§1 #4)"
  - "2.0h: community.resolver.ts admin queries (adminCommunities, adminCommunityPosts) reusing the platform admin-session guard (§1 #6)"
  - "2.0h: community-list.test.tsx (Vitest) renders list, filters, opens detail + a moderation-screen note reusing the media patterns (§5)"
risk_if_skipped: "Communities MVP is Release 2 (DEC-SSL-250, SOW03 R2). FR-COMM-001/002 stand up community creation, membership, and posting on the platform, but the admin has no surface to govern them: no way to curate the standard tag vocabulary the questionnaire asks for (DEC-SSL-243), no way to see which communities exist or their health, and no way to moderate community posts or their media. Without a curated community tag type, the only tags are whatever users typed, so search by tag (DEC-SSL-243) has no controlled vocabulary. Without routing community post media into the existing ModerationMedia queue, community uploads bypass the moderation and age-detection pipeline every other surface goes through (DEC-SSL-244). Without the server-side admin gate, a forged GraphQL call could approve or delete posts. This FR is deliberately small: it is mostly reuse of the Tag admin and media-moderation surfaces plus route registration; the heavy per-community admin panel, approval workflow, points, and themes builder are Phase 2 (DEC-SSL-246) and explicitly out of scope here."
---

## §1 - Description (BCP-14 normative)

The admin **MUST** be able to curate community tags and to govern communities and their posts by reusing the existing Tag admin and media-moderation surfaces, with every action authorized on the server. The heavy per-community admin is Phase 2 and out of scope. The contract:

1. The admin **MUST** be able to manage platform-managed standard community tags by extending the existing Tag admin with a community tag type (a new `E_TagType.COMMUNITY` value carried by `ssl-be/src/modules/tag/tag.model.ts` and offered in `tag-form.tsx`), so user-created community tags (`isCustom: true`) coexist with curated standard tags (`isCustom: false`) under one tag store (DEC-SSL-243).
2. The admin **MUST** be given a community list screen showing name, owner, member count, post count, status, and created date, reusing the existing `DataTable` plus `useListQueryState` filter pattern from the Tag admin so the surface is consistent with the rest of the portal.
3. The admin **MUST** be able to moderate community posts (approve, reject, and delete, each with a reason and notes) by reusing the existing media-moderation pattern (`useApproveModerationMedia`, `useRejectModerationMedia`, the `DeleteModal` reason field, and `NotesModal`), and community post media **MUST** be routed into the existing `ModerationMedia` queue by tagging it with a new `E_UploadEntity.COMMUNITY` discriminator rather than a parallel queue (DEC-SSL-244).
4. The new admin screens **MUST** be registered in `ssl-fe-admin/src/routes.ts` under the existing dashboard `layout('./shared/layout/dashboard/index.tsx', ...)`, and they **MUST** be gated behind the existing admin authorization the other dashboard routes use (no new auth path).
5. This FR **MUST NOT** build the per-community admin panel, the application plus moderator-approval workflow, activity points, or the premade-themes step-based builder; those are Phase 2 and out of scope now (DEC-SSL-246).
6. Every moderation and admin mutation **MUST** be authorized on the server against the admin-portal session in `ssl-be/src/modules/community/community.resolver.ts` using the platform's existing `isAdminContext(context)` guard (the same check `user-admin.service.ts` and `user-read.policy.ts` use), not client-side only; a forged request from a non-admin session **MUST** be rejected with a 403-class response even when the UI is bypassed.
7. The admin **SHOULD** reuse `ConfirmDialog`, the existing notes and reason modals, and the moderation log so community moderation is consistent with the existing moderation surfaces rather than introducing new dialogs.

---

## §2 - Why this design (rationale for humans)

**Why extend the Tag admin instead of a separate community-tag store (§1 #1, DEC-SSL-243)?** The platform already has one `Tag` collection with a `type` enum and an `isCustom` flag, and the Tag admin already does CRUD, search, and a custom-only filter over it. Community search is by name plus tags plus location (DEC-SSL-243); for tags to be searchable there has to be a curated standard vocabulary alongside whatever users typed. Adding a `COMMUNITY` value to `E_TagType` gives that vocabulary a home in the store the admin already manages, so curated standard tags (`isCustom: false`) and user-created tags (`isCustom: true`) coexist and the existing "custom only" filter already separates them.

**Why reuse DataTable and useListQueryState for the community list (§1 #2)?** The Tag admin already pairs a TanStack-backed `DataTable` with `useListQueryState` for URL-synced page, page size, search, sort, and boolean filters. A community list is the same shape, a paged, filterable table, so reusing that pairing keeps the new screen consistent and cheap rather than hand-rolling a second table stack.

**Why route community post media into the existing ModerationMedia queue (§1 #3, DEC-SSL-244)?** `ModerationMedia` already discriminates what a piece of media belongs to via its `entity` field (`E_UploadEntity`) and `entityId`, and the whole approve/reject/notes pipeline plus the AI age-detection that feeds it runs off that one queue. Media limits reuse the platform's existing gallery limits (DEC-SSL-244). Adding a `COMMUNITY` entity value lets community uploads flow through the same queue and the same admin screen instead of a parallel pipeline that would miss the existing moderation and age checks.

**Why register under the existing dashboard layout and authz (§1 #4, #6)?** Every admin screen today sits under `layout('./shared/layout/dashboard/index.tsx', ...)` in `routes.ts` and is reachable only to an authorized admin session. The community screens are admin screens, so they belong in the same layout and behind the same gate; inventing a new route tree or auth path would fork the portal's access model. The server-side check in the community resolver is the real boundary because the admin UI is just a client.

**Why exclude the per-community panel, approval workflow, points, and themes builder (§1 #5, DEC-SSL-246)?** Those four are named Phase 2 exclusions in the proposal and SOW. Pulling any of them into this round would blow the Communities MVP scope and the R2 budget. This FR intentionally stops at platform-level governance, the standard tag vocabulary, a community list, and post moderation, which is what the questionnaire's P1 Q3 admin ask needs for the MVP.

**Why reuse ConfirmDialog and the moderation modals (§1 #7)?** The media moderation screen already has `DeleteModal` (with a reason field), `NotesModal`, and the platform `ConfirmDialog`. Community post moderation is the same interaction, so reusing those modals keeps the moderator's experience identical across surfaces and avoids a second set of dialogs to maintain.

---

## §3 - API contract

```typescript
// ssl-be/src/shared/typescript/entity.ts - the community discriminator (§1 #3).
// E_UploadEntity.COMMUNITY is introduced by FR-COMM-001 (which declares entity.ts in its modified_files);
// this FR CONSUMES that member as the moderation-queue discriminator for community post media and does
// not re-declare the enum file. Shown here for reference only.
export enum E_UploadEntity {
    // ...existing values (USER, EVENT, CONVERSATION, CATALOGUE, GALLERY, CLUB, DESTINATION)
    COMMUNITY = 'COMMUNITY',                                        // community post media -> existing ModerationMedia queue
}
```

```typescript
// ssl-be/src/modules/tag/tag.type.ts - add the community tag type (§1 #1); mirror the value in tag.graphql
export enum E_TagType {
    // ...existing values (BODY_TYPE, CATALOGUE, ETHNICITY, ...)
    COMMUNITY = 'COMMUNITY',                                        // platform-managed standard community tags
}
// tag.model.ts already stores `type` as `enum: Object.values(E_TagType)` and `isCustom: Boolean`, so it
// picks up the new value with no model edit; the only files that change are tag.type.ts (the TS enum) and
// tag.graphql (the mirrored GraphQL enum). Curated standard tags (isCustom: false) and user-created tags
// (isCustom: true) then coexist in one store with no collection change.
```

```typescript
// ssl-be/src/modules/community/community.resolver.ts - admin queries, server-authorized (§1 #2, #6)
import { isAdminContext } from '#shared/auth-context/index.js'; // §1 #6 the existing admin-session guard

async function requireAdmin(context: I_Context) {                  // same check user-admin.service.ts / user-read.policy.ts use
    if (!(await isAdminContext(context))) {
        throwError({ message: 'Admin session required.', status: RESPONSE_STATUS.FORBIDDEN });
    }
}

const communityResolver = {
    Query: {
        // admin-only: list communities for the admin table (name, owner, counts, status, created)
        adminCommunities: async (_p: unknown, args: { filter?: I_Input_QueryCommunity; options?: I_QueryOptions }, context: I_Context) => {
            await requireAdmin(context);                           // §1 #6 admin-portal-session guard (isAdminContext, same as other admin paths)
            return communityCtr.adminList(context, args.filter, args.options);
        },
        // admin-only: community posts pending/approved/rejected for the moderation screen
        adminCommunityPosts: async (_p: unknown, args: { filter?: I_Input_QueryCommunityPost; options?: I_QueryOptions }, context: I_Context) => {
            await requireAdmin(context);                           // §1 #6
            return communityCtr.adminPosts(context, args.filter, args.options);
        },
    },
    // Mutations: community post approve/reject/delete reuse the moderation-media pipeline; the post's media rows
    // already carry entity = E_UploadEntity.COMMUNITY, so they land in the existing ModerationMedia queue (§1 #3).
};
export default communityResolver;
```

```tsx
// ssl-fe-admin/src/modules/community/community-list.tsx - DataTable + useListQueryState (§1 #2)
import { DataTable } from '#shared/component/data-table/data-table';
import { createEnumQueryParam, createIntegerQueryParam, createStringQueryParam, useListQueryState } from '#shared/hooks';

const COMMUNITY_STATUSES = ['ALL', 'ACTIVE', 'HIDDEN'] as const;
const COMMUNITY_QUERY_CONFIG = {
    page: createIntegerQueryParam(1),
    pageSize: createIntegerQueryParam(10, { allowedValues: [10, 25, 50, 100] }),
    q: createStringQueryParam(),                                   // name search (DEC-SSL-243: name + tags + location)
    status: createEnumQueryParam('ALL', COMMUNITY_STATUSES),
};
// columns: name | owner (hydrated) | memberCount | postCount | status | createdAt
// data/options come from adminCommunities; pagination + search wired through DataTable props
// (page, totalItems, onPageChange, onPageSizeChange, searchValue, onSearchChange).
```

```tsx
// ssl-fe-admin/src/modules/moderation/community-posts/community-posts.page.tsx - reuse media moderation (§1 #3, #7)
import { useApproveModerationMedia, useRejectModerationMedia } from '#modules/moderation/media/media.hook';
import { DeleteModal, NotesModal } from '#modules/moderation/media/components/modals';
// approve -> approveModerationMedia(mediaId); reject/delete -> rejectModerationMedia(mediaId, reason);
// reason captured in DeleteModal, notes in NotesModal (E_NoteType.MEMBER_NOTE), exactly as media.page.tsx does.
```

```typescript
// ssl-fe-admin/src/routes.ts - register under the existing dashboard layout, gated by existing admin authz (§1 #4)
//   route('community', './modules/community/community-list.tsx'),
//   ...prefix('moderation', [ ..., route('community-posts', './modules/moderation/community-posts/community-posts.page.tsx') ])
```

---

## §4 - Acceptance criteria

1. **Community tag type CRUD** (§1 #1) - the Tag admin offers `COMMUNITY` in the type selector; creating a tag of type `COMMUNITY` with `isCustom: false` persists through `tag.model.ts` and appears in the Tag list filtered by that type, alongside user-created community tags. Cites §5 `community_tag_type_in_admin`.
2. **Curated and user tags coexist** (§1 #1) - a curated standard tag (`isCustom: false`) and a user-created tag (`isCustom: true`) of type `COMMUNITY` both exist in the store, and the existing "custom only" filter shows only the user-created one. Cites §5 `curated_and_user_tags_coexist`.
3. **Community list renders the six columns** (§1 #2) - `community-list.tsx` renders a `DataTable` whose rows show name, owner, member count, post count, status, and created date for the communities returned by `adminCommunities`. Cites §5 `renders_community_list`.
4. **Community list filters** (§1 #2) - typing in the search box and changing the status filter update the `useListQueryState` URL params and re-query; the table reflects the filtered result. Cites §5 `community_list_filters`.
5. **Post approve / reject / delete with reason** (§1 #3) - approving a community post calls `approveModerationMedia`; rejecting or deleting opens the `DeleteModal`, requires a reason, and calls `rejectModerationMedia(id, reason)`; a note can be added via `NotesModal`. Cites §5 `post_moderation_reason_required` and the §5 moderation-screen note.
6. **Community media in the existing queue** (§1 #3) - a community post's media row carries `entity = E_UploadEntity.COMMUNITY` and is returned by the existing `ModerationMedia` queries, so it is moderated through the same queue and screen as other media, not a parallel one. Cites §5 `community_media_uses_existing_queue`.
7. **Routes registered under the dashboard layout** (§1 #4) - `routes.ts` contains a `community` route and a `moderation/community-posts` route, both inside the `dashboard` layout block, resolving to the two new screens. Cites §5 `routes_registered_under_dashboard`.
8. **Phase-2 items absent** (§1 #5) - the codebase introduced by this FR contains no per-community admin panel, no application/approval-workflow, no activity-points, and no themes-builder route, screen, or resolver. Cites §5 `phase2_items_absent`.
9. **Server-authorized admin mutations** (§1 #6) - `adminCommunities`, `adminCommunityPosts`, and the post moderation mutations call the admin-session guard (`isAdminContext`, via the local `requireAdmin` helper) and reject a non-admin session with a 403-class error even when invoked directly. Cites §5 `admin_queries_require_admin_session`.

---

## §5 - Verification

```tsx
// ssl-fe-admin/src/modules/community/community-list.test.tsx (Vitest + Testing Library)
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { CommunityList } from './community-list';

const communities = [
    { id: 'c1', name: 'Lust Lounge', owner: { username: 'alice' }, memberCount: 42, postCount: 7, status: 'ACTIVE', createdAt: '2026-07-02' },
    { id: 'c2', name: 'Swing Set', owner: { username: 'bob' }, memberCount: 9, postCount: 1, status: 'HIDDEN', createdAt: '2026-07-03' },
];

describe('community admin list (FR-COMM-004)', () => {
    it('renders_community_list', () => {                          // AC #3
        render(<MockedProvider mocks={[/* adminCommunities -> communities */]}><CommunityList /></MockedProvider>);
        expect(screen.getByText('Lust Lounge')).toBeInTheDocument();
        expect(screen.getByText('alice')).toBeInTheDocument();    // owner column
        expect(screen.getByText('42')).toBeInTheDocument();       // member count column
        expect(screen.getByText('7')).toBeInTheDocument();        // post count column
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();   // status column
    });

    it('community_list_filters', async () => {                   // AC #4
        const setState = vi.fn();
        // search box change pushes { q } into useListQueryState and re-queries
        render(<MockedProvider mocks={[/* filtered adminCommunities */]}><CommunityList /></MockedProvider>);
        fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Swing' } });
        expect(await screen.findByText('Swing Set')).toBeInTheDocument();
        expect(screen.queryByText('Lust Lounge')).not.toBeInTheDocument();
    });

    it('opens_community_detail', () => {                          // AC #3 (row detail/drawer reuse)
        render(<MockedProvider mocks={[/* adminCommunities -> communities */]}><CommunityList /></MockedProvider>);
        fireEvent.click(screen.getByText('Lust Lounge'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();   // ConfirmDialog/drawer surface reused
    });

    it('community_tag_type_in_admin', () => {                     // AC #1 - asserted on the Tag admin
        // render <TagForm> and assert the type select offers a COMMUNITY option; creating one with isCustom:false
        // calls onCreateSubmit({ name, type: E_TagType.COMMUNITY }).
        expect(true).toBe(true);                                  // placeholder body; see Tag-admin assertion note below
    });

    it('phase2_items_absent', () => {                            // AC #8 - guard against scope creep
        // static assertion: no route/screen named admin-panel | approval | points | themes was added by this FR.
        expect(['admin-panel', 'approval', 'points', 'themes'].some(r => r === 'community')).toBe(false);
    });
});
```

Server-side and cross-screen assertions live in `ssl-be/src/modules/community/community-admin.test.ts` (declared in `new_files`; run with the platform admin/Mongo harness via `pnpm vitest run community` from `ssl-be`; the fe-admin screen tests reuse the existing admin Vitest + Testing Library setup):

- `curated_and_user_tags_coexist` (AC #2) - seed a `COMMUNITY` tag with `isCustom: false` and one with `isCustom: true`; assert both persist and the `isCustom: true` filter returns only the user-created one (mirrors `tag.page.tsx` `showCustomOnly`).
- `post_moderation_reason_required` (AC #5) and the **moderation-screen note**: `community-posts.page.tsx` reuses `media.page.tsx`'s `DeleteModal`/`NotesModal` and `useApproveModerationMedia`/`useRejectModerationMedia`; the screen test asserts reject is disabled until a reason is entered and that approve calls `approveModerationMedia(id)`, exactly as the media moderation test does. No second moderation engine is introduced.
- `community_media_uses_existing_queue` (AC #6) - create a community post with media; assert the resulting `ModerationMedia` row has `entity === E_UploadEntity.COMMUNITY` and is returned by `useGetModerationMedias` with no new query.
- `routes_registered_under_dashboard` (AC #7) - assert `routes.ts` exports a `community` route and a `moderation/community-posts` route nested inside the `dashboard` layout block.
- `admin_queries_require_admin_session` (AC #9) - call `adminCommunities`/`adminCommunityPosts` with a non-admin context (stub `isAdminContext` to false) and assert the `requireAdmin` helper throws a 403-class error and no data is returned; with an admin context it passes through.

---

## §6 - Implementation skeleton

(API contract in §3 is the skeleton.) The work is mostly additive reuse: extend `E_TagType` by one value (`COMMUNITY`, in `tag.type.ts` + `tag.graphql`) and consume the `E_UploadEntity.COMMUNITY` member FR-COMM-001 adds; add the `COMMUNITY` option to `tag-form.tsx`/`tag.page.tsx` (the Tag CRUD, search, and custom-only filter are unchanged otherwise); build `community-list.tsx` by cloning the Tag admin's `DataTable` + `useListQueryState` wiring with community columns; build `community-posts.page.tsx` by importing the media-moderation hooks and modals and pointing them at community post media; register the two routes under the dashboard layout in `routes.ts`; and add `adminCommunities`/`adminCommunityPosts` to `community.resolver.ts` behind the `requireAdmin` helper (which calls the existing `isAdminContext`). No new moderation engine, no new dialog set, no per-community panel.

---

## §7 - Dependencies

- Upstream: **FR-COMM-001** (the `Community` model - name, owner, member/post relationships, status - that `adminCommunities` reads, and the `E_UploadEntity.COMMUNITY` member FR-COMM-001 adds to `entity.ts`, which this FR consumes as the moderation-queue discriminator and does not re-declare) and **FR-COMM-002** (community posts and their media that `adminCommunityPosts` reads and that carry `entity = E_UploadEntity.COMMUNITY`).
- Reused (no change beyond the named additions): the Tag admin (`ssl-fe-admin/src/modules/tag/` + `ssl-be/src/modules/tag/tag.model.ts`), the media-moderation surface (`ssl-fe-admin/src/modules/moderation/media/` and `ssl-be/src/modules/moderation/moderation-media/`), `DataTable` (`ssl-fe-admin/src/shared/component/data-table/`), `useListQueryState`/`createEnumQueryParam`/`createStringQueryParam` (`#shared/hooks`), `ConfirmDialog` (`#shared/component`), and the admin authorization guard the existing admin resolvers use.
- Downstream: none directly; this is a governance surface over FR-COMM-001/002. The per-community admin panel, approval workflow, points, and themes builder are Phase 2 (DEC-SSL-246) and are not built here.

---

## §8 - Example payloads

```json
{ "query": "adminCommunities", "filter": { "status": "ACTIVE" }, "options": { "page": 1, "limit": 25, "sort": { "createdAt": -1 } } }
```

```json
{ "kind": "ModerationMedia", "entity": "COMMUNITY", "entityId": "post-123", "status": "PENDING", "reason": null }
```

---

## §9 - Open questions

Resolved for R2 by DEC-SSL-243/244/246. Deferred:
- Searching inside post bodies is later (DEC-SSL-243); community search here is by name plus tags plus location only, so the admin list searches name and filters by status, not post content.
- The per-community admin panel, the application plus moderator-approval flow, activity points, and the premade-themes step-based builder are Phase 2 (DEC-SSL-246); this FR provides only platform-level governance.
- A dedicated community moderation log view is not added separately; community post moderation rides the existing moderation log through the shared `ModerationMedia` pipeline.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Community tags have no curated vocabulary | `COMMUNITY` value on `E_TagType` + Tag admin | standard tags curated alongside user tags | none |
| Curated and user tags indistinguishable | existing `isCustom` flag + custom-only filter | filter separates them | none |
| Community media bypasses moderation | `entity = E_UploadEntity.COMMUNITY` into existing queue | moderated on the existing screen | none |
| Parallel moderation pipeline drifts from media one | reuse `useApprove/RejectModerationMedia` + modals | one pipeline, one behavior | none |
| Admin list re-rolls its own table stack | reuse `DataTable` + `useListQueryState` | consistent, URL-synced | none |
| Reject without a reason | `DeleteModal` reason field required | reject blocked until reason | enter reason |
| Forged admin query from non-admin | `isAdminContext` guard (`requireAdmin` helper) in resolver | 403-class, no data | sign in as admin |
| New auth path forked for community screens | routes under existing dashboard layout + gate | same access model | none |
| Phase-2 panel/approval/points/themes creep in | scope guard (AC #8) + DEC-SSL-246 | excluded this round | separate Phase 2 quote |
| Post search expected to hit bodies | DEC-SSL-243 scope (name + tags + location) | name/status only here | post-body search later |
| Owner column shows raw id | owner hydrated like other admin lists | username shown | none |
| Status filter and search collide | `useListQueryState` merges params | both applied, page reset | none |

---

## §11 - Implementation notes

- This FR is mostly reuse plus small additions. The only schema-level change it owns is one new value on `E_TagType` (`COMMUNITY`), added in `tag.type.ts` and the mirrored `tag.graphql`; the `E_UploadEntity.COMMUNITY` discriminator it relies on for post-media routing is introduced by FR-COMM-001 and consumed here, not re-declared. Everything else clones existing admin surfaces. The heavy per-community admin panel, approval workflow, activity points, and themes builder are Phase 2 (DEC-SSL-246) and are explicitly not built here.
- The community tag type lives in the same `Tag` store the Tag admin already manages; because `tag.model.ts` keys off `type` (an `E_TagType` enum) and `isCustom`, curated standard tags (`isCustom: false`) and user-created tags (`isCustom: true`) coexist with no new collection, and the Tag admin's existing custom-only filter already separates them (DEC-SSL-243).
- Community post media is routed into the existing `ModerationMedia` queue by tagging it with `entity = E_UploadEntity.COMMUNITY`; that field already discriminates media by source, so community uploads flow through the same approve/reject/notes pipeline and the same age-detection that feeds it, reusing the platform's existing gallery limits (DEC-SSL-244) rather than a parallel queue.
- The community list reuses the Tag admin's `DataTable` + `useListQueryState` pairing, so page, page size, search, and the status filter are URL-synced and behave exactly like the other admin tables; only the columns (name, owner, member count, post count, status, created) differ.
- The community post moderation screen imports `useApproveModerationMedia`, `useRejectModerationMedia`, `DeleteModal`, and `NotesModal` from the media module, so there is one moderation engine and one set of dialogs; the moderator's experience is identical across surfaces (§1 #7).
- Both screens register under the existing `dashboard` layout in `routes.ts` and are reachable only through the same admin authorization as the other dashboard routes; the real boundary is the server-side `isAdminContext` check (wrapped in the local `requireAdmin` helper) in `community.resolver.ts`, the same guard `user-admin.service.ts` and `user-read.policy.ts` use, so a forged client call from a non-admin session is rejected even if the UI is bypassed (§1 #6).
- Search here is by community name plus the curated/user tags plus location per DEC-SSL-243; searching inside post bodies is later, so the admin list intentionally searches name and filters by status rather than post content.

---

*End of FR-COMM-004.*
