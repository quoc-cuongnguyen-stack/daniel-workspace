---
id: FR-GUEST-001
title: "On-profile guestbook: paid-member write/reply gating with owner moderation"
module: GUEST
priority: MUST
status: ready_to_implement
verify: T
phase: R1
milestone: "Release 1 - quick wins"
slice: 1
owner: Stephen Cheng
created: 2026-06-29
shipped: null
memory_chain_hash: null
related_frs: []
depends_on: []
blocks: []
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P2 Q5 Guestbook"
  - "docs/SSL_NewFeatures_Proposal_Quotation_L4.docx#P3.4-3.5"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Guestbook"
source_decisions:
  - DEC-SSL-220 (the guestbook at the bottom of every profile restricts writing and replying to paying members; non-members can still read; the profile owner can remove entries on their own guestbook)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-be/src/modules/guestbook/guestbook.model.ts
  - ssl-be/src/modules/guestbook/guestbook.controller.ts
  - ssl-be/src/modules/guestbook/guestbook.resolver.ts
  - ssl-be/src/modules/guestbook/guestbook.type.ts
  - ssl-be/src/modules/guestbook/guestbook.test.ts
  - ssl-fe-user/src/modules/profile/(components)/guestbook-comment-item.tsx
  - ssl-fe-user/src/modules/profile/(components)/guest-book.test.tsx
modified_files:
  - ssl-fe-user/src/modules/profile/(components)/guest-book.tsx
  - ssl-fe-user/src/modules/profile/profile.hook.ts
allowed_tools:
  - file_read: "ssl-be/src/**, ssl-fe-user/src/**"
  - file_write: "ssl-be/src/modules/guestbook/**, ssl-fe-user/src/modules/profile/**"
  - bash: cd ssl-be && pnpm vitest run guestbook
disallowed_tools:
  - accept a write or reply from a non-paying member (per DEC-SSL-220)
  - remove an entry as someone who is neither the profile owner nor the entry author (per DEC-SSL-220)
effort_hours: 12
sub_tasks:
  - "2.0h: guestbook.model.ts + guestbook.type.ts - schema (profileOwnerId, writerId, parentEntryId, content, deletedAt) + virtuals for writer hydration"
  - "3.0h: guestbook.controller.ts - writeEntry/replyEntry (isPaidMember guard), removeEntry (owner-or-author soft-delete), listEntries (public, deletedAt null)"
  - "1.5h: guestbook.resolver.ts - Query listEntries + Mutation writeEntry/replyEntry/removeEntry, audit emits"
  - "2.5h: guest-book.tsx + guestbook-comment-item.tsx - composer-vs-CTA swap, threaded replies, owner/author remove with confirmation"
  - "1.0h: profile.hook.ts - useGuestbook write/reply/remove wiring over the new resolver"
  - "2.0h: guestbook.test.ts (Vitest) server gate/authorization + guest-book.test.tsx composer-vs-CTA note"
risk_if_skipped: "The guestbook is a Release 1 quick win (DEC-SSL-220, SOW03 R1). Today the UI at guest-book.tsx renders a composer for any logged-in user with no membership gate, so a free member can already post; there is no reply thread and no owner moderation, and entries ride on the conversation/message tables rather than a first-class store. Without a server-side gate a forged GraphQL mutation from a free account writes entries the product says are paid-only, breaking the freemium promise the membership upsell depends on. Without owner-or-author removal the profile owner cannot clean their own guestbook, and without soft-delete a removed entry cannot be audited or recovered. This FR is the greenfield guestbook module plus the on-profile gating UI."
---

## §1 - Description (BCP-14 normative)

The guestbook **MUST** sit at the bottom of every profile, be readable by everyone, and restrict writing, replying, and entry removal per DEC-SSL-220, enforced on the server. The contract:

1. The guestbook **MUST** be presented at the bottom of every profile and **MUST** be readable by everyone, including non-members and logged-out viewers; `listEntries(profileOwnerId)` returns the profile's entries with no auth requirement (DEC-SSL-220).
2. Writing a new guestbook entry **MUST** be restricted to paying members, gated by `authnCtr.isPaidMember(context)`; a non-paying or logged-out user **MUST NOT** be able to write, and the UI **MUST** show an upgrade CTA in place of the composer for them (DEC-SSL-220).
3. Replying to an entry **MUST** be restricted to paying members on the same `authnCtr.isPaidMember(context)` basis; a non-paying user **MUST** see the upgrade CTA rather than a reply composer (DEC-SSL-220).
4. The profile owner **MUST** be able to remove any entry on their own guestbook, and an entry's author **MUST** be able to remove their own entry; removal **MUST** be a soft-delete that sets `deletedAt`, and entries with a non-null `deletedAt` **MUST** be excluded from `listEntries` reads (DEC-SSL-220).
5. The write gate, the reply gate, and the removal authorization **MUST** be enforced on the server in the controller and resolver, not only in the UI; a forged client request from a non-member **MUST** be rejected with a 403-class response even if the UI is bypassed (DEC-SSL-220).
6. Replies **MUST** be threaded via `parentEntryId`, and each entry's writer avatar and name **MUST** be hydrated through `hydrateUserMedia` so a not-age-verified writer's avatar is blurred consistently with the rest of the platform.
7. Each successful write, reply, and remove **MUST** emit a structured audit line through the platform's existing `log` utility (`@cyberskill/shared/node/log`) carrying a stable `kind` of `guestbook.entry_written`, `guestbook.entry_replied`, or `guestbook.entry_removed` plus the relevant ids, so trust-and-safety can reconstruct who wrote, replied, or removed. The module **SHOULD** reuse the platform's existing comment soft-delete conventions (the `deletedAt` pattern and `MongooseController`) rather than inventing new ones.

---

## §2 - Why this design (rationale for humans)

**Why a first-class guestbook module instead of reusing conversation/message (§1 #1, #4, #6)?** Today `guest-book.tsx` posts through `useCreateMessage` into a `PROFILE_COMMENT` conversation. That store has no concept of "the owner can moderate this" and no per-entry soft-delete, so it cannot satisfy owner removal or threaded replies cleanly. A dedicated `Guestbook`/`GuestbookEntry` schema with `profileOwnerId`, `writerId`, `parentEntryId`, and `deletedAt` makes the moderation and threading model explicit and queryable.

**Why gate on the server, not just the UI (§1 #2, #3, #5)?** The composer-vs-CTA swap in the client is a courtesy, not a control. Apollo mutations are reachable directly, so a free account could call `writeEntry` even while the UI hides the box. `authnCtr.isPaidMember(context)` already encodes the real rule (paid role plus an active membership window, falling back to free when expired), so the resolver path reuses it as the one source of truth and rejects forged calls.

**Why `isPaidMember` specifically (§1 #2, #3)?** It is the same predicate the rest of the backend uses for paid-only behavior. It checks the `PAID_MEMBER` or `PROMO_MEMBER` role and then `isMembershipActive`, so an expired paid member is correctly treated as free. Hand-rolling a role check here would drift from the platform rule and let lapsed members keep posting.

**Why owner-or-author removal and soft-delete (§1 #4, #7)?** DEC-SSL-220 gives the profile owner moderation over their own guestbook; the entry author should also be able to retract their own words. A hard delete would lose the moderation trail and make abuse review impossible, so removal flips `deletedAt` and reads filter it out. This mirrors the `deletedAt` convention already used elsewhere in the platform.

**Why hydrate writer media through `hydrateUserMedia` (§1 #6)?** Every other surface that shows a user's avatar runs it through `hydrateUserMedia`, which blurs the image when the writer is not age-verified and signs the Bunny URL for the viewer's tier. The guestbook must not become a hole that leaks a clear avatar of a not-verified user, so each writer is hydrated the same way.

**Why audit every mutation (§1 #7)?** Writes, replies, and removals on a public profile surface are exactly the events a trust-and-safety review needs after the fact. Emitting a structured line per mutation keeps the guestbook consistent with how the platform records moderation-relevant actions.

---

## §3 - API contract

```typescript
// ssl-be/src/modules/guestbook/guestbook.model.ts
import { mongo } from '@cyberskill/shared/node/mongo';
import mongoose from 'mongoose';

import type { I_GuestbookEntry } from './guestbook.type.js';

export const GuestbookEntryModel = mongo.createModel<I_GuestbookEntry>({
    mongoose,
    name: 'GuestbookEntry',
    schema: {
        profileOwnerId: { type: String, required: true },          // whose guestbook (§1 #1)
        writerId: { type: String, required: true },                // who wrote it
        parentEntryId: { type: String, default: null },            // threaded replies (§1 #6)
        content: { type: String, required: true },
        deletedAt: { type: Date, default: null },                  // soft-delete (§1 #4)
    },
    virtuals: [
        {
            name: 'writer',                                        // hydrated via hydrateUserMedia (§1 #6)
            options: { ref: 'User', localField: 'writerId', foreignField: 'id', justOne: true },
        },
    ],
});
```

```typescript
// ssl-be/src/modules/guestbook/guestbook.controller.ts
import { RESPONSE_STATUS } from '@cyberskill/shared/constant';
import { throwError } from '@cyberskill/shared/node/log';
import { MongooseController } from '@cyberskill/shared/node/mongo';

import { authnCtr } from '#modules/authn/authn.controller.js';
import { userCtr } from '#modules/user/user.controller.js';
import { getViewerMediaContext, hydrateUserMedia } from '#modules/user/user.validate.js';

import type { I_GuestbookEntry } from './guestbook.type.js';
import { GuestbookEntryModel } from './guestbook.model.js';

const mongooseCtr = new MongooseController<I_GuestbookEntry>(GuestbookEntryModel);

export const guestbookCtr = {
    // §1 #1 public read - no auth; deletedAt null only
    listEntries: async (context: I_Context, profileOwnerId: string) => {
        const res = await mongooseCtr.getMany(context, {
            filter: { profileOwnerId, deletedAt: null },
            options: { sort: { createdAt: -1 }, populate: [{ path: 'writer', populate: ['partner1.gallery', 'partner2.gallery'] }] },
        });
        res.result?.docs?.forEach((e) => {
            const { mediaOptions } = getViewerMediaContext((e as any).writer);   // §1 #6
            hydrateUserMedia((e as any).writer, mediaOptions);
        });
        return res;
    },

    // §1 #2 + #5 paid-only write, enforced server-side
    writeEntry: async (context: I_Context, profileOwnerId: string, content: string) => {
        if (!(await authnCtr.isPaidMember(context))) {
            throwError({ message: 'Only paying members can write in the guestbook.', status: RESPONSE_STATUS.FORBIDDEN });
        }
        const me = await authnCtr.getUserFromSession(context);
        const created = await mongooseCtr.createOne(context, { doc: { profileOwnerId, writerId: me.id, content } });
        // emit guestbook.entry_written (§1 #7)
        return created;
    },

    // §1 #3 + #5 paid-only reply, enforced server-side
    replyEntry: async (context: I_Context, parentEntryId: string, content: string) => {
        if (!(await authnCtr.isPaidMember(context))) {
            throwError({ message: 'Only paying members can reply in the guestbook.', status: RESPONSE_STATUS.FORBIDDEN });
        }
        const parent = await mongooseCtr.getOne(context, { filter: { id: parentEntryId, deletedAt: null } });
        if (!parent.success) throwError({ message: 'Entry not found.', status: RESPONSE_STATUS.BAD_REQUEST });
        const me = await authnCtr.getUserFromSession(context);
        const created = await mongooseCtr.createOne(context, {
            doc: { profileOwnerId: parent.result.profileOwnerId, writerId: me.id, parentEntryId, content },
        });
        // emit guestbook.entry_replied (§1 #7)
        return created;
    },

    // §1 #4 + #5 owner-or-author soft-delete, enforced server-side
    removeEntry: async (context: I_Context, entryId: string) => {
        const me = await authnCtr.getUserFromSession(context);
        const found = await mongooseCtr.getOne(context, { filter: { id: entryId, deletedAt: null } });
        if (!found.success) throwError({ message: 'Entry not found.', status: RESPONSE_STATUS.BAD_REQUEST });
        const e = found.result;
        const isOwner = e.profileOwnerId === me.id;
        const isAuthor = e.writerId === me.id;
        if (!isOwner && !isAuthor) {
            throwError({ message: 'You cannot remove this entry.', status: RESPONSE_STATUS.FORBIDDEN });
        }
        const updated = await mongooseCtr.updateOne(context, { filter: { id: entryId }, update: { deletedAt: new Date() } });
        // emit guestbook.entry_removed (§1 #7)
        return updated;
    },
};
```

```typescript
// ssl-be/src/modules/guestbook/guestbook.resolver.ts - the gate lives here too (§1 #5)
const guestbookResolver = {
    Query: {
        listGuestbookEntries: (_p: unknown, args: { profileOwnerId: string }, context: I_Context) =>
            guestbookCtr.listEntries(context, args.profileOwnerId),
    },
    Mutation: {
        writeGuestbookEntry: (_p: unknown, args: { profileOwnerId: string; content: string }, context: I_Context) =>
            guestbookCtr.writeEntry(context, args.profileOwnerId, args.content),
        replyGuestbookEntry: (_p: unknown, args: { parentEntryId: string; content: string }, context: I_Context) =>
            guestbookCtr.replyEntry(context, args.parentEntryId, args.content),
        removeGuestbookEntry: (_p: unknown, args: { entryId: string }, context: I_Context) =>
            guestbookCtr.removeEntry(context, args.entryId),
    },
};
export default guestbookResolver;
```

---

## §4 - Acceptance criteria

1. **Public read at bottom of profile** (§1 #1) - `listEntries(ownerId)` returns the owner's non-deleted entries for a logged-out caller and for a free member; the profile page renders the guestbook section at the bottom for both. Cites §5 `read_is_public`.
2. **Member write succeeds** (§1 #2) - with `isPaidMember` true, `writeEntry(ownerId, "hi")` creates an entry that appears in the next `listEntries`. Cites §5 `paid_member_can_write`.
3. **Non-member write rejected server-side** (§1 #2, #5) - with `isPaidMember` false, `writeEntry` throws a FORBIDDEN error and creates no entry, even when called directly (UI bypassed). Cites §5 `free_member_write_rejected`.
4. **Reply is paid-gated and threaded** (§1 #3, #5, #6) - with `isPaidMember` false, `replyEntry(parentId, "...")` throws FORBIDDEN; with it true, the reply is created with `parentEntryId` set to its parent. Cites §5 `reply_is_paid_gated`.
5. **Owner removes any entry** (§1 #4) - the profile owner calls `removeEntry` on another member's entry on their guestbook; it sets `deletedAt` and the entry leaves `listEntries`. Cites §5 `owner_removes_any_entry`.
6. **Author removes own entry** (§1 #4) - the writer calls `removeEntry` on their own entry; it is soft-deleted. Cites §5 `author_removes_own_entry`.
7. **Non-owner non-author remove rejected** (§1 #4, #5) - a third member (neither owner nor author) calls `removeEntry` and gets FORBIDDEN; the entry is unchanged. Cites §5 `stranger_remove_rejected`.
8. **Soft-deleted entries excluded from reads** (§1 #4) - after a removal, `listEntries` (and reply lookups) exclude the entry because `deletedAt` is non-null; the row still exists in the collection. Cites §5 `deleted_excluded_from_reads`.
9. **Composer swaps to upgrade CTA for non-members** (§1 #2, #3) - the client renders the textarea/post button only when the viewer is a paid member; otherwise it renders the upgrade CTA, and reply controls follow the same gate. Cites §5 `composer_vs_cta_swap`.
10. **Writer media is hydrated on read** (§1 #6) - `listEntries` passes each entry's `writer` through `hydrateUserMedia`; a not-age-verified writer's avatar URL comes back blurred (CDN `class=blur`), not a clear URL. Cites §5 `writer_media_hydrated`.
11. **Mutations emit audit lines** (§1 #7) - a successful `writeEntry`, `replyEntry`, and `removeEntry` each emit a structured `log` line whose `kind` is the matching `guestbook.entry_written` / `guestbook.entry_replied` / `guestbook.entry_removed`, with its ids. Cites §5 `mutations_emit_audit`.

---

## §5 - Verification

```typescript
// ssl-be/src/modules/guestbook/guestbook.test.ts (Vitest)
import { describe, expect, it, vi } from 'vitest';
import { log } from '@cyberskill/shared/node/log';
import { authnCtr } from '#modules/authn/authn.controller.js';
import { guestbookCtr } from './guestbook.controller.js';

const ctx = () => ({ req: { session: {} } } as any);
const asPaid = (paid: boolean) => vi.spyOn(authnCtr, 'isPaidMember').mockResolvedValue(paid);
const asUser = (id: string) => vi.spyOn(authnCtr, 'getUserFromSession').mockResolvedValue({ id } as any);

describe('guestbook gating + moderation (DEC-SSL-220)', () => {
    it('read_is_public', async () => {            // AC #1
        const res = await guestbookCtr.listEntries(ctx(), 'owner1');   // no auth set up
        expect(res.success).toBe(true);
    });

    it('paid_member_can_write', async () => {     // AC #2
        asPaid(true); asUser('member1');
        const r = await guestbookCtr.writeEntry(ctx(), 'owner1', 'hi');
        expect(r.success).toBe(true);
    });

    it('free_member_write_rejected', async () => {// AC #3 (forged call)
        asPaid(false); asUser('free1');
        await expect(guestbookCtr.writeEntry(ctx(), 'owner1', 'hi')).rejects.toThrow();
    });

    it('reply_is_paid_gated', async () => {       // AC #4
        asPaid(false); asUser('free1');
        await expect(guestbookCtr.replyEntry(ctx(), 'entryX', 'no')).rejects.toThrow();
        asPaid(true); asUser('member2');
        const r = await guestbookCtr.replyEntry(ctx(), 'entryX', 'yes');
        expect(r.result.parentEntryId).toBe('entryX');
    });

    it('owner_removes_any_entry', async () => {   // AC #5
        asUser('owner1');                          // entry by member1 on owner1's guestbook
        const r = await guestbookCtr.removeEntry(ctx(), 'entryByMember1');
        expect(r.result.deletedAt).not.toBeNull();
    });

    it('author_removes_own_entry', async () => {  // AC #6
        asUser('member1');
        const r = await guestbookCtr.removeEntry(ctx(), 'entryByMember1');
        expect(r.result.deletedAt).not.toBeNull();
    });

    it('stranger_remove_rejected', async () => {  // AC #7
        asUser('member3');                         // neither owner nor author
        await expect(guestbookCtr.removeEntry(ctx(), 'entryByMember1')).rejects.toThrow();
    });

    it('deleted_excluded_from_reads', async () => {// AC #8
        asUser('owner1');
        await guestbookCtr.removeEntry(ctx(), 'entryByMember1');
        const res = await guestbookCtr.listEntries(ctx(), 'owner1');
        expect(res.result.docs.find((e: any) => e.id === 'entryByMember1')).toBeUndefined();
    });

    it('writer_media_hydrated', async () => {     // AC #10 - not-verified writer's avatar blurred
        // seed an entry whose writer is not age-verified, then read
        const res = await guestbookCtr.listEntries(ctx(), 'ownerNV');
        const url = res.result.docs[0]?.writer?.partner1?.gallery?.url ?? '';
        expect(url).toContain('class=blur');                       // hydrateUserMedia applied
    });

    it('mutations_emit_audit', async () => {      // AC #11 - one audit line per mutation
        const spy = vi.spyOn(log, 'info');                         // platform structured-log utility (@cyberskill/shared/node/log)
        asPaid(true); asUser('member1');
        await guestbookCtr.writeEntry(ctx(), 'owner1', 'hi');
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ kind: 'guestbook.entry_written' }));
    });
});
```

```tsx
// ssl-fe-user/src/modules/profile/(components)/guest-book.test.tsx
// composer_vs_cta_swap (AC #9): render <GuestBook> with a free-member auth and assert the
// upgrade CTA (MembershipPopup trigger) is shown and the textarea/post button is NOT rendered;
// re-render with a paid-member auth (isPaidMember(user) true) and assert the composer IS rendered.
// Reply controls follow the same gate via guestbook-comment-item.tsx.
```

The model and resolver run against the project's Mongo test harness; `pnpm vitest run guestbook` from `ssl-be`. The fe-user test uses the existing component test setup.

---

## §6 - Implementation skeleton

(API contract in §3 is the skeleton.) The resolver delegates straight to the controller; the controller carries the three cross-cutting rules on every mutation: the `isPaidMember` gate (write and reply), the owner-or-author check (remove), and the `deletedAt` soft-delete plus read filter. On the client, `guest-book.tsx` chooses composer-vs-CTA from the viewer's membership, `guestbook-comment-item.tsx` renders one entry with its threaded replies and the owner/author remove action behind a `confirmation.tsx` dialog, and `profile.hook.ts` gains `useGuestbook` write/reply/remove calls over the new resolver.

---

## §7 - Dependencies

- Upstream: **authn** (`authnCtr.isPaidMember` and `authnCtr.getUserFromSession` from `ssl-be/src/modules/authn/authn.controller.ts`) - the paid gate and the acting user; **user** (`hydrateUserMedia` + `getViewerMediaContext` from `ssl-be/src/modules/user/user.validate.ts`) - writer avatar hydration; the shared `MongooseController` and `mongo.createModel` from `@cyberskill/shared/node/mongo`.
- Client: **membership** (`MembershipPopup` at `ssl-fe-user/src/modules/membership/membership-popup.tsx`) for the upgrade CTA; **confirmation** (`ssl-fe-user/src/shared/component/ui/confirmation.tsx`) for the remove dialog; `isFreeMember`/`isMemberShip`/`isPaidMember` from `ssl-fe-user/src/shared/util/profile.ts` for the composer-vs-CTA decision.
- Downstream: none; the guestbook is a leaf surface on the profile page.

---

## §8 - Example payloads

```json
{ "kind": "guestbook.entry_written", "payload": { "profileOwnerId": "owner1", "writerId": "member1", "entryId": "e-123" } }
```

```json
{ "kind": "guestbook.entry_removed", "payload": { "entryId": "e-123", "removedBy": "owner1", "asOwner": true } }
```

---

## §9 - Open questions

All resolved for R1. Deferred:
- Pagination of replies: v1 lists replies inline under each top-level entry; a "show more replies" page is a later nicety (the top-level list already paginates like the current guestbook).
- Edit of a guestbook entry: out of scope this FR; DEC-SSL-220 covers write, reply, and owner removal only. Chat edit (DEC-SSL-210) is a separate feature.
- Notifying the profile owner on a new entry: reuse of the existing notification module is possible but not required by DEC-SSL-220; left for a follow-up.

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| Free member writes via UI | composer-vs-CTA swap (client) | CTA shown, no box | upgrade to paid |
| Free member forges `writeEntry` mutation | `isPaidMember` gate in controller/resolver | FORBIDDEN, no row | upgrade to paid |
| Free member forges `replyEntry` | same `isPaidMember` gate | FORBIDDEN, no row | upgrade to paid |
| Lapsed paid member posts | `isPaidMember` checks `isMembershipActive` | treated as free, rejected | renew membership |
| Logged-out user tries to write | no session -> `getUserFromSession` throws / gate false | rejected | sign in + upgrade |
| Owner cannot moderate own guestbook | owner branch in `removeEntry` | owner removal allowed | none |
| Author cannot retract own entry | author branch in `removeEntry` | author removal allowed | none |
| Stranger removes someone's entry | owner-or-author check | FORBIDDEN, unchanged | none |
| Removed entry still visible | `deletedAt: null` read filter | excluded from list | none |
| Hard delete loses moderation trail | soft-delete sets `deletedAt` | row retained | row still queryable |
| Not-verified writer's avatar leaks clear | `hydrateUserMedia` on each writer | blurred per platform rule | none |
| Reply to a deleted parent | `deletedAt: null` on parent lookup | reply rejected | none |
| Reply orphaned from owner | `profileOwnerId` copied from parent | reply scoped to same profile | none |
| Mutation not audited | emit `guestbook.*` per op | line recorded | none |
| Entry not found | existence check in remove/reply | BAD_REQUEST | refresh list |

---

## §11 - Implementation notes

- The paid gate is `authnCtr.isPaidMember(context)`, the same predicate the rest of the backend uses for paid-only behavior; it already folds in role plus active-membership, so an expired paid member is correctly denied without any guestbook-specific role logic.
- The gate is applied in the controller, which the resolver calls directly, so there is exactly one place to bypass and it is server-side; the client composer-vs-CTA swap is presentation only and never the security boundary (AC #3, #4).
- Removal authorization is owner-or-author: `profileOwnerId === me.id` gives the profile owner moderation over their own guestbook, and `writerId === me.id` lets an author retract; anyone else gets FORBIDDEN (AC #5, #6, #7).
- Soft-delete via `deletedAt` mirrors the platform's existing convention and keeps the moderation trail; every read (`listEntries` and the reply parent lookup) filters `deletedAt: null`, so removed entries vanish from the UI while staying in the collection for review (AC #8).
- Threading is a single `parentEntryId` level: top-level entries plus their replies, which matches the questionnaire's guestbook intent without a deep comment tree; a reply copies its parent's `profileOwnerId` so it cannot be orphaned onto a different profile.
- Each writer is hydrated through `hydrateUserMedia` with `getViewerMediaContext`, exactly as `authn.checkAuth` does, so a not-age-verified writer's avatar is blurred and the Bunny URL is signed for the viewer's tier; the guestbook does not become an avatar leak.
- The module follows the report module's shape (`mongo.createModel`, `new MongooseController`, a thin resolver delegating to the controller, virtuals for user hydration), so it sits naturally in the module-per-feature backend.
- On the client, the existing `guest-book.tsx` is retargeted from the conversation/message store to the new resolver via `profile.hook.ts`; `guestbook-comment-item.tsx` owns a single entry, its replies, and the remove action behind `confirmation.tsx`, and the upgrade path reuses `MembershipPopup`.

---

*End of FR-GUEST-001.*
