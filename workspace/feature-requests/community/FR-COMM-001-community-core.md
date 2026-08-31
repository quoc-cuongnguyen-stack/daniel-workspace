---
id: FR-COMM-001
title: "Communities core: open communities, create / join / leave, My Communities, paid-member gating, name+tag+location search"
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
related_frs: [FR-COMM-002, FR-COMM-003, FR-COMM-004]
depends_on: []
blocks: [FR-COMM-002, FR-COMM-003, FR-COMM-004]
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P1 Communities/Forum"
  - "docs/SSL_NewFeatures_Proposal_Quotation_L4.docx#P1"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Communities first version (MVP)"
source_decisions:
  - DEC-SSL-240 (a user must be a paying member to create a community or to post/comment; everyone can join an open community unless it is private)
  - DEC-SSL-243 (v1 search is by community name plus tags plus location; searching inside posts is later)
  - DEC-SSL-244 (media limits reuse the platform's existing gallery limits)
  - DEC-SSL-245 (communities are multilingual, reusing the existing i18n)
  - DEC-SSL-246 (Phase 2, out of scope this round: community map, private communities with application + approval, activity points, premade themes with the step builder, full in-community admin panel)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-be/src/modules/community/community.model.ts
  - ssl-be/src/modules/community/community-member.model.ts
  - ssl-be/src/modules/community/community.controller.ts
  - ssl-be/src/modules/community/community.resolver.ts
  - ssl-be/src/modules/community/community.type.ts
  - ssl-be/src/modules/community/community.test.ts
  - ssl-fe-user/src/app/[locale]/(main)/communities/page.tsx
  - ssl-fe-user/src/app/[locale]/(main)/communities/create/page.tsx
  - ssl-fe-user/src/app/[locale]/(main)/communities/[slug]/page.tsx
  - ssl-fe-user/src/modules/community/communities.page.tsx
  - ssl-fe-user/src/modules/community/community.hook.tsx
  - ssl-fe-user/src/modules/community/create-community-modal.tsx
  - ssl-fe-user/src/shared/component/card/card-community.tsx
  - ssl-fe-user/src/modules/community/community.test.tsx
modified_files:
  - ssl-be/src/shared/typescript/entity.ts
  - ssl-fe-user/src/shared/layout/main/header.tsx
  - ssl-fe-user/src/shared/constant/routes.ts
allowed_tools:
  - file_read: "ssl-be/src/**, ssl-fe-user/src/**"
  - file_write: "ssl-be/src/modules/community/**, ssl-fe-user/src/modules/community/**, ssl-fe-user/src/app/[locale]/(main)/communities/**, ssl-fe-user/src/shared/component/card/**"
  - bash: cd ssl-be && pnpm vitest run community
disallowed_tools:
  - accept createCommunity from a non-paying member (per DEC-SSL-240)
  - implement any Phase 2 item - map, private + approval, activity points, themes builder, admin panel (per DEC-SSL-246)
effort_hours: 28
sub_tasks:
  - "4.0h: community.type.ts + community.model.ts + community-member.model.ts - Community schema (name unique+trimmed, slug, description, headerImage, tagIds, ownerIds, memberCount, isOpen, deletedAt) + CommunityMember join, virtuals for owner/tag hydration"
  - "6.0h: community.controller.ts - createCommunity (isPaidMember guard + header-image ModerationMedia submit), joinCommunity / leaveCommunity (CommunityMember + memberCount), getCommunities (name+tags+location filter, paging), myCommunities, getCommunity(slug)"
  - "2.0h: community.resolver.ts - Query community/communities/myCommunities + Mutation createCommunity/joinCommunity/leaveCommunity, audit emits"
  - "5.0h: communities.page.tsx + card-community.tsx - Tab (All / My Communities), InfiniteScroll grid, search box (name+tags+location), join/leave button with MembershipPopup CTA for free members"
  - "4.0h: create-community-modal.tsx - step-light form (name, description, tags, header image via UploadMedia), free-member gate to MembershipPopup"
  - "2.0h: community.hook.tsx - useCommunities / useMyCommunities / useCreateCommunity / useJoinLeave Apollo wiring; routes.ts COMMUNITIES + COMMUNITY_DETAIL; header.tsx Communities nav entry"
  - "5.0h: community.test.ts (Vitest) gate + join/leave + memberCount + uniqueness + search + moderation; community.test.tsx create-flow + My Communities note"
risk_if_skipped: "Communities is the entire Release 2 deliverable (DEC-SSL-250, SOW03 R2) and the platform has no community code today - this is the greenfield core every other COMM FR builds on. Without a server-side isPaidMember gate on create, a forged GraphQL mutation from a free account creates communities the product says are paid-only, breaking the freemium promise the membership upsell depends on (the same hole FR-GUEST-001 closed for the guestbook). Without the CommunityMember join record and memberCount upkeep, join/leave is not idempotent and the count drifts. Without routing the header image through the existing ModerationMedia + AI pipeline, communities become an unmoderated image surface on an adult platform. Without name+tag+location search a user cannot find a community to join. FR-COMM-002 (posts/comments), FR-COMM-003 (community profile/feed), and FR-COMM-004 (tag taxonomy admin) all depend on this model and these operations existing first."
---

## §1 - Description (BCP-14 normative)

Communities core **MUST** model an open community and its membership, restrict creation to paying members on the server, let any logged-in user join and leave an open community, surface a My Communities view, run the header image through the existing moderation pipeline, and support name plus tags plus location search, reusing the existing i18n. The contract:

1. The system **MUST** model an open community as a `Community` document - `name` (unique, trimmed, non-empty), `slug`, `description`, `headerImage`, `tagIds`, `ownerIds`, `memberIds`, `memberCount`, `isOpen`, `createdAt`, `deletedAt` - and a `CommunityMember` join record (`communityId`, `userId`, `joinedAt`) as the source of truth for membership (DEC-SSL-240).
2. Creating a community **MUST** be restricted to paying members, gated by `authnCtr.isPaidMember(context)` and enforced on the server; a non-paying or logged-out caller of `createCommunity` **MUST** be refused, and the create UI **MUST** show the membership CTA in place of the form for free members (DEC-SSL-240).
3. Any logged-in user **MUST** be able to `joinCommunity` an open community and `leaveCommunity` it; private communities (application plus moderator approval) are Phase 2 and **MUST NOT** be implemented in this round (DEC-SSL-246).
4. The system **MUST** provide a "My Communities" view (`myCommunities`) that returns only the communities the caller has joined, derived from `CommunityMember`, not the full catalogue.
5. The create flow **MUST** be step-light, capturing `name`, `description`, `tags`, and a `headerImage`; the header image **MUST** be submitted to the existing `ModerationMedia` plus AI moderation pipeline (entity `COMMUNITY`, status `PENDING`) and **MUST** reuse the existing gallery media limits rather than defining new ones (DEC-SSL-244).
6. Search **MUST** match communities by `name` plus `tags` plus `location` for v1; searching inside posts **MUST NOT** be built in this round (DEC-SSL-243).
7. Communities **MUST** be multilingual by reusing the existing i18n (next-intl on the client, the shared i18n on the server); this FR **MUST NOT** introduce a separate translation store (DEC-SSL-245).
8. The system **MUST** enforce `name` uniqueness on a trimmed, non-empty value, and **MUST** keep `memberCount` consistent with `CommunityMember` across join and leave (idempotent: a second join, or a leave by a non-member, does not change the count).
9. The system **MUST** expose the GraphQL operations `createCommunity`, `joinCommunity`, `leaveCommunity`, `community(slug)`, `communities(filter, page, sort)`, and `myCommunities`, and **SHOULD** record a structured log line on create, join, and leave on a best-effort basis via the existing platform logger (SSL has no dedicated audit store today, so this is logging, not a guaranteed audit trail; a real audit pipeline is a separate cross-cutting FR).
10. The system **MUST NOT** implement any Phase 2 item - community map (MapTiler), private communities with application plus approval, activity points, premade themes with the step builder, or the full in-community admin panel; these are explicitly out of scope and separately quoted (DEC-SSL-241, DEC-SSL-246).
11. Community tags **SHOULD** reuse the platform `Tag` taxonomy (`TagModel`, admin-managed standard tags); the standard-tag admin surface is FR-COMM-004 and this FR consumes `tagIds` without owning that admin.

---

## §2 - Why this design (rationale for humans)

**Why a separate CommunityMember join record (§1 #1, #8)?** Membership is a many-to-many relation that join and leave mutate concurrently. A join document is the durable source of truth; `memberCount` and the `memberIds` array on `Community` are denormalized read accelerators kept in step with it. Deriving My Communities and idempotency from the join records (one per user per community, unique) is what keeps the count from drifting when a user double-taps join or leaves twice.

**Why a server-side isPaidMember gate (§1 #2, DEC-SSL-240)?** The client already exposes `isFreeMember`/`isPaidMember` (src/shared/util/profile.ts) and a MembershipPopup, but a client gate only hides the button. The product rule is that creating a community is a paid action, so the rule has to live where it cannot be bypassed: `authnCtr.isPaidMember(context)` in the controller, exactly as FR-GUEST-001 gates guestbook writes. The UI gate is a courtesy; the server gate is the contract.

**Why route the header image through ModerationMedia (§1 #5, DEC-SSL-244)?** This is an adult platform where every user-supplied image already passes `ModerationMedia` plus the AI moderation queue (src/modules/moderation/). A community header is just another user-supplied image; letting it skip moderation would open an unmoderated image surface. Reusing the existing pipeline (entity `COMMUNITY`, `status: PENDING`) and the existing gallery limits (UploadMedia: up to 5 files, 20 MB image / 500 MB video) means no new moderation or limit logic and a consistent reviewer workflow.

**Why name plus tags plus location search now, posts later (§1 #6, DEC-SSL-243)?** A user joining communities needs to find one by what it is (name), what it is about (tags), and where it is (location). Full-text search inside posts is a heavier, separately scoped feature; the client locked v1 search to the three structured facets, so the controller filter covers exactly those and nothing more.

**Why reuse the existing i18n (§1 #7, DEC-SSL-245)?** Communities are multilingual like the rest of the platform. The client renders with next-intl and the server with the shared i18n; reusing them keeps one translation pipeline instead of a community-specific fork.

**Why a slug (§1 #1, #9)?** The detail route is `/communities/[slug]` and the `community(slug)` query reads by it, so a URL-safe, stable slug derived from the trimmed name (with a uniqueness suffix on collision) gives shareable links that do not leak the Mongo id and do not break when a name is reused.

**Why exclude Phase 2 explicitly (§1 #10, DEC-SSL-246)?** Map, private-with-approval, activity points, themes builder, and the admin panel are a separate quote. Naming them as out of scope here prevents scope creep into the Release 2 MVP and keeps the slice deliverable.

---

## §3 - API contract

```typescript
// ssl-be/src/modules/community/community.type.ts
import type { I_GenericDocument, T_Omit_Create, T_Omit_Update } from '@cyberskill/shared/node/mongo';
import type { I_Tag } from '#modules/tag/index.js';
import type { I_User } from '#modules/user/index.js';

export interface I_Community extends I_GenericDocument {
    name?: string;          // unique, trimmed, non-empty (§1 #1, #8)
    slug?: string;          // url-safe, derived from name (§1 #1)
    description?: string;
    headerImage?: string;   // moderated via ModerationMedia (§1 #5)
    tagIds?: string[];      // platform Tag taxonomy (§1 #11)
    tags?: I_Tag[];         // virtual
    ownerIds?: string[];    // creators (paying members) (§1 #2)
    memberIds?: string[];   // denormalized read accelerator (§1 #8)
    memberCount?: number;   // kept in step with CommunityMember (§1 #8)
    isOpen?: boolean;       // v1 is always true; private is Phase 2 (§1 #3, #10)
    locationId?: string;    // for location search (§1 #6)
    deletedAt?: Date | null;
}

export type T_Community_Populate = 'tags' | 'owners';

export interface I_Input_QueryCommunity extends Omit<I_Community, T_Community_Populate> {}

export interface I_Input_CreateCommunity
    extends Omit<I_Community, T_Omit_Create | T_Community_Populate | 'slug' | 'memberIds' | 'memberCount' | 'ownerIds'> {
    name: string;
    description?: string;
    tagIds?: string[];
    headerImage?: string;
    locationId?: string;
}

export interface I_Input_CommunityFilter {
    name?: string;          // name contains (§1 #6)
    tagIds?: string[];      // any-of tags (§1 #6)
    locationId?: string;    // location (§1 #6)
}
```

```typescript
// ssl-be/src/modules/community/community.controller.ts
import { MongooseController } from '@cyberskill/shared/node/mongo';
import { authnCtr } from '#modules/authn/authn.controller.js';
import { moderationMediaCtr } from '#modules/moderation/index.js';
import { E_ModerationMediaType } from '#modules/moderation/index.js';
import { E_UploadEntity } from '#shared/typescript/index.js';
import { CommunityModel } from './community.model.js';
import { CommunityMemberModel } from './community-member.model.js';

const mongooseCtr = new MongooseController<I_Community>(CommunityModel);

export const communityCtr = {
    createCommunity: async (context: I_Context, args: I_Input_CreateOne<I_Input_CreateCommunity>) => {
        const isPaid = await authnCtr.isPaidMember(context);                 // §1 #2 server gate
        if (!isPaid) {
            throwError({ message: 'Only paying members can create a community.', status: RESPONSE_STATUS.FORBIDDEN });
        }
        const me = await authnCtr.getUserFromSession(context);
        const name = (args.doc.name ?? '').trim();                          // §1 #8 trim
        if (!name) {
            throwError({ message: 'Community name is required.', status: RESPONSE_STATUS.BAD_REQUEST });
        }
        const slug = await uniqueSlug(name);                                // §1 #1 url-safe, unique
        if (args.doc.headerImage) {                                          // §1 #5 moderation pipeline
            await moderationMediaCtr.createModerationMedia(context, {
                doc: { type: E_ModerationMediaType.IMAGE, uploadedById: me.id, url: args.doc.headerImage, entity: E_UploadEntity.COMMUNITY },
            });                                                             // status defaults to PENDING
        }
        const created = await mongooseCtr.createOne(context, {
            doc: { ...args.doc, name, slug, ownerIds: [me.id], memberIds: [me.id], memberCount: 1, isOpen: true },
        });
        // creator auto-joins
        await CommunityMemberModel.create({ communityId: created.result.id, userId: me.id });
        logger.info('community.created', { communityId: created.result.id, slug }); // §1 #9 best-effort log
        return created;
    },

    joinCommunity: async (context: I_Context, communityId: string) => {
        const me = await authnCtr.getUserFromSession(context);
        const community = await getOpenCommunityOrThrow(context, communityId); // §1 #3 open only
        const existing = await CommunityMemberModel.findOne({ communityId, userId: me.id });
        if (existing) return { success: true, result: community };          // §1 #8 idempotent
        await CommunityMemberModel.create({ communityId, userId: me.id });
        const res = await mongooseCtr.updateOne(context, {
            filter: { id: communityId },
            update: { $addToSet: { memberIds: me.id }, $inc: { memberCount: 1 } },
        });
        logger.info('community.joined', { communityId, userId: me.id }); // §1 #9 best-effort log
        return res;
    },

    leaveCommunity: async (context: I_Context, communityId: string) => {
        const me = await authnCtr.getUserFromSession(context);
        const removed = await CommunityMemberModel.deleteOne({ communityId, userId: me.id });
        if (removed.deletedCount === 0) {                                   // §1 #8 idempotent
            return communityCtr.getCommunityById(context, communityId);
        }
        const res = await mongooseCtr.updateOne(context, {
            filter: { id: communityId },
            update: { $pull: { memberIds: me.id }, $inc: { memberCount: -1 } },
        });
        logger.info('community.left', { communityId, userId: me.id }); // §1 #9 best-effort log
        return res;
    },

    getCommunities: (context: I_Context, args: I_Input_FindPaging<I_Input_CommunityFilter>) => {
        const filter: T_QueryFilter<I_Community> = { deletedAt: null };     // §1 #6 name+tags+location
        if (args.filter?.name) filter.name = { $regex: args.filter.name.trim(), $options: 'i' } as any;
        if (args.filter?.tagIds?.length) filter.tagIds = { $in: args.filter.tagIds } as any;
        if (args.filter?.locationId) filter.locationId = args.filter.locationId;
        return mongooseCtr.getMany(context, { ...args, filter });
    },

    myCommunities: async (context: I_Context, args: I_Input_FindPaging<I_Input_CommunityFilter>) => {
        const me = await authnCtr.getUserFromSession(context);             // §1 #4 joined-only
        const memberships = await CommunityMemberModel.find({ userId: me.id }).select('communityId');
        const ids = memberships.map(m => m.communityId);
        return mongooseCtr.getMany(context, { ...args, filter: { id: { $in: ids }, deletedAt: null } as any });
    },

    getCommunity: (context: I_Context, slug: string) =>                    // §1 #9 read by slug
        mongooseCtr.getOne(context, { filter: { slug, deletedAt: null } as any }),
};
```

```typescript
// ssl-be/src/modules/community/community.resolver.ts - thin delegation (mirrors report.resolver.ts)
const communityResolver = {
    Query: {
        community: (_p, args, ctx: I_Context) => communityCtr.getCommunity(ctx, args.slug),
        communities: (_p, args: I_Input_FindPaging<I_Input_CommunityFilter>, ctx: I_Context) => communityCtr.getCommunities(ctx, args),
        myCommunities: (_p, args: I_Input_FindPaging<I_Input_CommunityFilter>, ctx: I_Context) => communityCtr.myCommunities(ctx, args),
    },
    Mutation: {
        createCommunity: (_p, args: I_Input_CreateOne<I_Input_CreateCommunity>, ctx: I_Context) => communityCtr.createCommunity(ctx, args),
        joinCommunity: (_p, args: { communityId: string }, ctx: I_Context) => communityCtr.joinCommunity(ctx, args.communityId),
        leaveCommunity: (_p, args: { communityId: string }, ctx: I_Context) => communityCtr.leaveCommunity(ctx, args.communityId),
    },
};
export default communityResolver;
```

---

## §4 - Acceptance criteria

1. **Paid create succeeds** (§1 #2, #9) - with `isPaidMember` true, `createCommunity({ name: "Lisbon Swingers" })` creates a `Community`, sets `ownerIds = [me]`, `memberCount = 1`, `isOpen = true`, and a `CommunityMember` for the creator, and the community is then readable by `community(slug)`. Verified by `paid_member_can_create` in §5.
2. **Free create rejected server-side** (§1 #2) - with `isPaidMember` false, `createCommunity` is refused with FORBIDDEN and no `Community` is written, even though the client gate is bypassed. Verified by `free_member_create_rejected` in §5.
3. **Model shape** (§1 #1) - a created community has the required fields (`name`, `slug`, `description`, `headerImage`, `tagIds`, `ownerIds`, `memberIds`, `memberCount`, `isOpen`, `createdAt`, `deletedAt`) and the join `CommunityMember` carries `communityId` + `userId`. Verified by `paid_member_can_create` in §5.
4. **Join an open community** (§1 #3, #8) - a logged-in non-member calling `joinCommunity` gets a `CommunityMember` and `memberCount` increments by 1; a second join is a no-op (count unchanged). Verified by `join_is_idempotent` in §5.
5. **Leave an open community** (§1 #3, #8) - a member calling `leaveCommunity` removes the `CommunityMember` and decrements `memberCount` by 1; a leave by a non-member is a no-op (count unchanged). Verified by `leave_is_idempotent` in §5.
6. **My Communities is joined-only** (§1 #4) - `myCommunities` returns only communities the caller has a `CommunityMember` for, not the full catalogue. Verified by `my_communities_filters_to_joined` in §5.
7. **Header image is moderated** (§1 #5, #10) - `createCommunity` with a `headerImage` submits one `ModerationMedia` (entity `COMMUNITY`, `status: PENDING`) and reuses the existing gallery limits; no new limit constant is introduced. Verified by `header_image_enters_moderation` in §5.
8. **Name uniqueness, trimmed** (§1 #8) - creating with a name that trims to an existing name is rejected; a whitespace-padded name is stored trimmed. Verified by `name_unique_trimmed` in §5.
9. **Search by name+tags+location** (§1 #6) - `communities({ filter })` matches on `name` (case-insensitive contains), `tagIds` (any-of), and `locationId`, and matches on no other field (a post-body term does not match). Verified by `search_name_tags_location` in §5.
10. **Phase 2 items absent and no translation fork** (§1 #7, #10) - the module exposes no map, no private/approval, no activity-points, no themes-builder, and no admin-panel operation; `isOpen` is always true on create and there is no `applyToCommunity`/`approveMember` mutation; and the module introduces no community-specific translation store or model (multilingual support is the existing i18n only, per §1 #7). Verified by `phase2_items_absent` in §5.
11. **Create flow + My Communities (client)** (§1 #2, #4, #5) - the create modal swaps to the MembershipPopup CTA for a free member and submits name/description/tags/header for a paid member; the All / My Communities tab shows joined-only under My Communities. Verified by the `community.test.tsx` note in §5.

---

## §5 - Verification

```typescript
// ssl-be/src/modules/community/community.test.ts (Vitest)
import { describe, expect, it, vi } from 'vitest';
import { communityCtr } from './community.controller.js';

// isPaidMember and getUserFromSession are mocked per case; CommunityModel/CommunityMemberModel
// run against the in-memory Mongo used by the rest of the suite (see tag-list-query.test.ts).

describe('community core', () => {
    it('paid_member_can_create', async () => {                                  // AC #1, #3
        const ctx = ctxAsPaid('u1');
        const res = await communityCtr.createCommunity(ctx, { doc: { name: 'Lisbon Swingers' } });
        expect(res.success).toBe(true);
        expect(res.result.ownerIds).toEqual(['u1']);
        expect(res.result.memberCount).toBe(1);
        expect(res.result.isOpen).toBe(true);
        expect(await memberCount(res.result.id)).toBe(1);                       // CommunityMember written
        const bySlug = await communityCtr.getCommunity(ctx, res.result.slug);   // §1 #9 community(slug) exposed
        expect(bySlug.result.id).toBe(res.result.id);
    });

    it('free_member_create_rejected', async () => {                             // AC #2
        const ctx = ctxAsFree('u2');
        await expect(communityCtr.createCommunity(ctx, { doc: { name: 'X' } })).rejects.toThrow();
        expect(await communityCount({ name: 'X' })).toBe(0);                     // nothing written
    });

    it('join_is_idempotent', async () => {                                      // AC #4
        const c = await seedCommunity('Berlin', { isOpen: true });
        await communityCtr.joinCommunity(ctxAsFree('u3'), c.id);
        await communityCtr.joinCommunity(ctxAsFree('u3'), c.id);                 // second join
        expect(await reload(c.id).then(x => x.memberCount)).toBe(1 + 1);         // creator + u3, no double
    });

    it('leave_is_idempotent', async () => {                                     // AC #5
        const c = await seedCommunity('Vienna', { isOpen: true });
        await communityCtr.joinCommunity(ctxAsFree('u4'), c.id);
        await communityCtr.leaveCommunity(ctxAsFree('u4'), c.id);
        await communityCtr.leaveCommunity(ctxAsFree('u4'), c.id);                // leave by non-member
        expect(await reload(c.id).then(x => x.memberCount)).toBe(1);            // back to creator only
    });

    it('my_communities_filters_to_joined', async () => {                        // AC #6
        const a = await seedCommunity('A', { isOpen: true });
        await seedCommunity('B', { isOpen: true });                             // not joined
        await communityCtr.joinCommunity(ctxAsFree('u5'), a.id);
        const mine = await communityCtr.myCommunities(ctxAsFree('u5'), {});
        expect(mine.result.docs.map((d: any) => d.name)).toEqual(['A']);
    });

    it('header_image_enters_moderation', async () => {                          // AC #7
        const spy = vi.spyOn(moderationMediaCtr, 'createModerationMedia');
        await communityCtr.createCommunity(ctxAsPaid('u6'), { doc: { name: 'Madrid', headerImage: 'https://cdn/x.jpg' } });
        expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            doc: expect.objectContaining({ entity: 'COMMUNITY', url: 'https://cdn/x.jpg' }),
        }));                                                                    // status defaults PENDING
    });

    it('name_unique_trimmed', async () => {                                     // AC #8
        await communityCtr.createCommunity(ctxAsPaid('u7'), { doc: { name: 'Roma' } });
        await expect(communityCtr.createCommunity(ctxAsPaid('u7'), { doc: { name: '  Roma  ' } })).rejects.toThrow();
        const c = await communityCtr.createCommunity(ctxAsPaid('u7'), { doc: { name: '  Oslo  ' } });
        expect(c.result.name).toBe('Oslo');                                     // trimmed
    });

    it('search_name_tags_location', async () => {                               // AC #9
        await seedCommunity('Paris Couples', { isOpen: true, tagIds: ['t1'], locationId: 'loc-fr' });
        const byName = await communityCtr.getCommunities(ctx0(), { filter: { name: 'paris' } });
        expect(byName.result.docs.length).toBe(1);
        const byTag = await communityCtr.getCommunities(ctx0(), { filter: { tagIds: ['t1'] } });
        expect(byTag.result.docs.length).toBe(1);
        const byLoc = await communityCtr.getCommunities(ctx0(), { filter: { locationId: 'loc-fr' } });
        expect(byLoc.result.docs.length).toBe(1);
    });

    it('phase2_items_absent', async () => {                                     // AC #10
        expect((communityCtr as any).applyToCommunity).toBeUndefined();
        expect((communityCtr as any).approveMember).toBeUndefined();
        const c = await seedCommunity('Open Only', {});
        expect((await reload(c.id)).isOpen).toBe(true);                          // no private path
    });
});
```

The client flow is covered by `ssl-fe-user/src/modules/community/community.test.tsx` (React Testing Library): rendering `create-community-modal.tsx` for a free member (`isFreeMember` true) shows the MembershipPopup CTA and no form, and for a paid member shows the name/description/tags/`UploadMedia` form; the All / My Communities `Tab` renders the joined-only set under My Communities (AC #11).

---

## §6 - Implementation skeleton

(The API contract in §3 is the skeleton.) Mirror the existing module-per-feature layout used by `report/`: `community.model.ts` via `mongo.createModel` with virtuals for `owners` and `tags`; `community-member.model.ts` with a unique compound index on `{ communityId, userId }`; `community.controller.ts` over a `new MongooseController<I_Community>(CommunityModel)`; `community.resolver.ts` delegating Query/Mutation to the controller; `community.type.ts` with the enums/interfaces. `slug` and audit emits are helpers in the controller. Wire the resolver into the GraphQL schema registry the way `reportResolver` is, and export the module from a `community/index.ts`.

---

## §7 - Dependencies

- Upstream: none (greenfield). Consumes existing primitives only: `authnCtr.isPaidMember` / `getUserFromSession` (authn), `moderationMediaCtr` + `E_ModerationMediaType` + `E_UploadEntity.COMMUNITY` (moderation), `TagModel` / `E_TagType` (tag), `MongooseController` + `mongo.createModel` (shared).
- Related: **FR-COMM-004** (standard-tag admin taxonomy this FR consumes as `tagIds`).
- Downstream: **FR-COMM-002** (posts/comments, paid gating on post/comment per DEC-SSL-240), **FR-COMM-003** (community profile/feed), **FR-COMM-004** - all depend on this `Community` + `CommunityMember` model and these operations.
- Client: reuses `UploadMedia`, `Tab`, `Modal`, `InfiniteScroll`, `MembershipPopup`, `isMemberShip` / `isFreeMember`; adds the `COMMUNITIES` + `COMMUNITY_DETAIL` routes and the header Communities nav entry. Requires `E_UploadEntity.COMMUNITY` to exist (add the enum member alongside this FR).

---

## §8 - Example payloads

```json
{ "kind": "community.created", "payload": { "communityId": "c_01H...", "slug": "lisbon-swingers" } }
```

```json
{ "kind": "community.joined", "payload": { "communityId": "c_01H...", "userId": "u_88..." } }
```

---

## §9 - Open questions

Resolved by the locked decisions. Recorded for the implementer:

- **Header-image limits.** Reuse the existing gallery limits via `UploadMedia` (up to 5 files, 20 MB image / 500 MB video) rather than a community-specific cap (DEC-SSL-244); a community needs only one header, so the UI restricts the picker to a single image.
- **Standard vs custom tags.** This FR consumes `tagIds` from the existing `Tag` taxonomy; whether community creators may mint custom tags (`isCustom`) or are limited to admin-managed standard tags is settled in FR-COMM-004. Default for v1: admin-managed standard tags only.
- **Location source.** `locationId` reuses the platform location model used for profile/search; the community map view that would render those locations is Phase 2 (DEC-SSL-241).

### Out of scope

Per DEC-SSL-241 and DEC-SSL-246, this FR does not build any of the following (separately quoted Phase 2): the community map (MapTiler), private communities with application plus moderator approval, activity points, premade themes with the step-based builder, and the full in-community admin panel. Posts auto-deleting at 12 months (DEC-SSL-242) and post/comment paid gating belong to FR-COMM-002, not here.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Free member creates a community (client gate bypassed) | `isPaidMember(context)` server gate | FORBIDDEN, nothing written | upgrade, then create (AC #2) |
| Logged-out caller hits createCommunity | `getUserFromSession` throws UNAUTHORIZED | refused | sign in |
| Duplicate community name (incl. whitespace variants) | trimmed-name uniqueness check + unique index | rejected | pick another name (AC #8) |
| Double join (double-tap) | `CommunityMember` existence check | no-op, count unchanged | none (AC #4) |
| Leave by a non-member | `deletedCount === 0` guard | no-op, count unchanged | none (AC #5) |
| `memberCount` drifts from join records | count derived from `$inc` paired with CommunityMember writes; index keeps joins unique | consistent | reconcile from CommunityMember if ever skewed |
| Header image skips moderation | createModerationMedia call on create (entity COMMUNITY, PENDING) | image queued for review | none (AC #7) |
| Join a private community | only `isOpen` communities are joinable; private is Phase 2 and absent | refused / not applicable | none (AC #10) |
| Search leaks on unintended fields | filter restricted to name/tagIds/locationId | only the three facets match | none (AC #9) |
| My Communities returns the full catalogue | filter to caller's CommunityMember ids | joined-only | none (AC #6) |
| Slug collision on reused name | uniqueSlug adds a suffix | unique, shareable URL | none |
| Phase 2 op called | those operations do not exist | not implemented | use the separately quoted Phase 2 work |
| Deleted community still searchable | `deletedAt: null` in every read filter | excluded | none |

---

## §11 - Implementation notes

- The two load-bearing rules - creation is paid-only, and join/leave keep `memberCount` honest - are enforced in the controller, not the resolver or the UI, so neither a forged mutation nor a bypassed client gate can break them. This mirrors how FR-GUEST-001 gates guestbook writes with the same `authnCtr.isPaidMember(context)` call.
- `CommunityMember` is the source of truth for membership; `memberIds` and `memberCount` on `Community` are denormalized accelerators updated in the same operation (`$addToSet` / `$pull` with `$inc`). A unique compound index on `{ communityId, userId }` makes join idempotent at the database, and the existence/`deletedCount` checks make it idempotent at the controller, so the count cannot drift on double-tap or double-leave.
- The header image rides the existing `ModerationMedia` plus AI pipeline (entity `COMMUNITY`, `status: PENDING` by default, per moderation-media.model.ts) and the existing `UploadMedia` gallery limits, so no new moderation path or limit constant is introduced - communities inherit the same review workflow as every other image on the platform (DEC-SSL-244).
- v1 search is exactly three structured facets - name (case-insensitive contains), tags (any-of `tagIds`), location (`locationId`) - and nothing else; searching inside posts is deferred to a later FR (DEC-SSL-243).
- Multilingual support reuses the existing i18n (next-intl client-side, the shared i18n server-side); this FR adds no community-specific translation store (DEC-SSL-245).
- The module follows the `report/` layout so it drops into the existing GraphQL registry with no new infrastructure: `mongo.createModel`, `MongooseController`, a thin resolver delegating to the controller, and typed `I_Input_*` shapes.
- Every Phase 2 capability (map, private + approval, activity points, themes builder, admin panel) is intentionally absent, asserted by `phase2_items_absent`, so the Release 2 MVP stays inside the agreed scope and quote (DEC-SSL-241, DEC-SSL-246).

---

*End of FR-COMM-001.*
