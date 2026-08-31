---
id: FR-COMM-003
title: "Community members section, online indicator, and community bell notifications"
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
related_frs: [FR-COMM-001, FR-COMM-002]
depends_on: [FR-COMM-001, FR-COMM-002]
blocks: []
source_pages:
  - "docs/SSL_NewFeatures_Requirements_Questionnaire_L4 (Updated).docx#P1 Communities/Forum"
  - "docs/SSL_NewFeatures_BudgetScope_R1_L4.docx#Communities first version (MVP)"
source_decisions:
  - DEC-SSL-245 (communities are multilingual, reusing the existing i18n)
  - DEC-SSL-246 (Phase 2, out of scope this round - activity points, the full in-community admin panel, private communities, the community map, premade themes)
language: typescript
service: "ssl-be + ssl-fe-user"
new_files:
  - ssl-be/src/modules/community/community-member.controller.ts
  - ssl-be/src/modules/community/community-notify.test.ts
  - ssl-fe-user/src/modules/community/community-members.tsx
  - ssl-fe-user/src/shared/component/ui/online-indicator.tsx
  - ssl-fe-user/src/modules/community/community-members.test.tsx
modified_files:
  - ssl-be/src/modules/notification/notification.type.ts
  - ssl-be/src/modules/notification/notification.graphql
  - ssl-be/src/modules/community/community.resolver.ts
  - ssl-fe-user/src/shared/layout/main/header.tsx
allowed_tools:
  - file_read: "ssl-be/src/**, ssl-fe-user/src/**"
  - file_write: "ssl-be/src/modules/community/**, ssl-fe-user/src/modules/community/**, ssl-fe-user/src/shared/component/ui/online-indicator.tsx"
  - bash: cd ssl-be && pnpm vitest run community-notify
disallowed_tools:
  - add a new presence subsystem, websocket heartbeat, or `lastOnline` writer (online state is derived from the existing user mechanism, §1 #2)
  - build a parallel notification pipeline, channel, or table (reuse `NotificationModel` + IN_APP, §1 #4)
  - implement per-community mute or cross-community activity points (Phase 2, DEC-SSL-246, §1 #7)
effort_hours: 14
sub_tasks:
  - "3.0h: community-member.controller.ts - listMembers (paged, online filter, online-first then lastOnline desc) + memberCount, reusing resolveOnlineStatus"
  - "2.0h: community.resolver.ts - communityMembers(communityId, filter, page) query wired to the controller"
  - "2.0h: notification.type.ts + notification.graphql - add COMMUNITY_MEMBER_JOINED + COMMUNITY_NEW_POST E_NotificationType members + COMMUNITY E_NotificationEntityType / E_RedirectType values (TS enums and the mirrored GraphQL enums)"
  - "2.5h: notify calls - emit on join (to existing members) and on new post/comment (to opted-in members) via createNotificationWithSettings, IN_APP"
  - "2.0h: online-indicator.tsx + community-members.tsx - reusable online dot + member list; header.tsx community line in the existing bell"
  - "2.5h: community-notify.test.ts + community-members.test.tsx - join emits, new-post notifies opted-in, online-first ordering, indicator + bell"
risk_if_skipped: "The members section and the community bell are the social proof that makes a community feel alive, and they are part of the Communities MVP (questionnaire P1). Without an online-first members list a visitor cannot tell whether anyone is around right now, and the strongest reason to open a community disappears. Reuse is the whole point of the design: online state must come from the platform's existing `resolveOnlineStatus(lastOnline)` (no second presence system to drift or contradict the green dot on every profile card), and community events must ride the existing `NotificationModel` + IN_APP bell (no parallel pipeline that bypasses block/settings/self-notify guards). Building either from scratch would double the surface, duplicate the 15-minute online window, and risk a members list whose counts disagree with FR-COMM-001 join/leave. This FR is the social layer over FR-COMM-001's community core, not a standalone feature."
---

## §1 - Description (BCP-14 normative)

The community members section lists a community's members with an online indicator, and community events (a member joined, a new post or comment) surface in the existing notification bell - both built by reuse, not by new infrastructure. The contract:

1. The members section **MUST** list a community's members each with an online indicator, sorted online members first and then by most-recently-active (`lastOnline` descending) within each group.
2. Online state **MUST** be derived from the platform's existing user online mechanism - `resolveOnlineStatus(user.lastOnline, now)` against `ONLINE_TIMEOUT_MS` (15 minutes) in `user.pure.util.ts`, the same computed `isOnline` field every profile card already reads - and the FR **MUST NOT** add a new presence system, heartbeat, or `lastOnline` writer.
3. The member list and the member count **MUST** stay consistent with join and leave from FR-COMM-001: a member appears once they join and drops off once they leave, and `memberCount` equals the number of `CommunityMember` rows for the community.
4. The FR **MUST** add community notification event types - a member joined, and a new post or comment for opted-in members - by adding new `E_NotificationType` members and reusing the existing `NotificationModel` and the `IN_APP` bell channel, and **MUST NOT** add a new notification table, channel, or delivery pipeline.
5. Community notifications **MUST** surface in the existing bell with the existing unread-badge behaviour - the badge count clears when the bell is opened, while per-entry read state is retained - consistent with the platform notification pattern (DEC-SSL-205-style: badge cleared on open, per-entry read kept).
6. The backend **MUST** expose a GraphQL `communityMembers(communityId, filter, page)` query that is paged and accepts an online-only filter, and **MUST** emit the new notifications server-side on the relevant events (on join, to existing members; on a new post or comment, to opted-in members).
7. The FR **MUST NOT** implement per-community mute or cross-community activity points; both are Phase 2 and out of scope for this round (DEC-SSL-246). Opt-out reuses the existing global notification settings, not a per-community control.
8. The online indicator **SHOULD** be a small reusable component (`online-indicator.tsx`) usable elsewhere, matching the existing green-dot styling so the members list and a profile card render the same affordance.

---

## §2 - Why this design

Why online state from the existing mechanism (§1 #2)? The platform already computes `isOnline` from a single `lastOnline` timestamp via `resolveOnlineStatus(lastOnline, now)` with a 15-minute window, and surfaces a green dot on every `card-profile`. A community-specific presence system would be a second source of truth that could disagree with that dot and would need its own writer, index, and timeout. Deriving the members list from the same field means the green dot in a community is the same green dot everywhere, by construction.

Why online-first then most-recently-active ordering (§1 #1)? A members section is most useful when the people you could talk to right now are at the top. Sorting online members first, then by `lastOnline` descending, puts live members above recently-seen ones and stale ones last - the same priority the rest of the platform implies with its online dot, made explicit in the list order.

Why counts tied to FR-COMM-001 (§1 #3)? The members list and the count are views over FR-COMM-001's `CommunityMember` rows. If they drifted - showing a member who left, or a count that disagreed with the roster - the community would look broken. Reading membership straight from FR-COMM-001 (filtered by `communityId`) keeps the list, the count, and the join/leave gate from FR-COMM-001 in agreement.

Why reuse `NotificationModel` + IN_APP (§1 #4, #5)? The platform has one notification rail: `NotificationModel` with a `type[]`, `actorId`, `targetId`, `channels` defaulting to `IN_APP`, a `status`, and a `presentation`, fronted by the bell and `useGetNotificationCounters`. Community events should be new `E_NotificationType` members on that rail, delivered through `createNotificationWithSettings` so they inherit the block, deleted-user, profile-complete, and self-notify guards for free. A parallel pipeline would re-implement all of that and could bypass a block or a settings opt-out.

Why no per-community mute or activity points (§1 #7, DEC-SSL-246)? The client deferred per-community controls, activity points, and the in-community admin panel to Phase 2. v1 opt-out is the existing global notification settings (`newMemberJoined`, `followingPostAnnouncement`), which `createNotificationWithSettings` already honours, so no new control ships this round.

Why a reusable indicator (§1 #8)? The green dot already exists inline in `card-profile.tsx` (`profile?.isOnline && <span ... bg-green-600 rounded-full>`). Extracting it into `online-indicator.tsx` lets the members list and any future surface share one component and one style, rather than copying the span.

---

## §3 - API contract

```typescript
// ssl-be/src/modules/notification/notification.type.ts - new members on the existing enums (§1 #4)
export enum E_NotificationType {
    // ...existing members (GROUP_MEMBER_JOINED, PROFILE_VISIT, GUESTBOOK_POST, ...)
    COMMUNITY_MEMBER_JOINED = 'COMMUNITY_MEMBER_JOINED', // a user joined a community I am in
    COMMUNITY_NEW_POST = 'COMMUNITY_NEW_POST',           // a new post or comment in a community I opted into
}
export enum E_NotificationEntityType { /* ...existing... */ COMMUNITY = 'COMMUNITY' }
export enum E_RedirectType { /* ...existing... */ COMMUNITY = 'COMMUNITY' }
```

```typescript
// ssl-be/src/modules/community/community-member.controller.ts (shapes)
import { resolveOnlineStatus } from '#modules/user/user.pure.util.js'; // §1 #2 existing online logic

interface I_MemberFilter { onlineOnly?: boolean }
interface I_MemberPage { skip?: number; limit?: number }

export const communityMemberCtr = {
    // §1 #1 #3 #6 paged roster, online-first then lastOnline desc, optional online-only filter
    listMembers(ctx: I_Context, communityId: string, filter?: I_MemberFilter, page?: I_MemberPage): Promise<I_MemberPageResult>;
    // §1 #3 memberCount === number of CommunityMember rows for the community (FR-COMM-001)
    memberCount(ctx: I_Context, communityId: string): Promise<number>;
    // §1 #4 #6 emit on join: notify each existing member (not the joiner); IN_APP; via settings-aware path
    notifyMemberJoined(ctx: I_Context, communityId: string, joinerId: string): Promise<void>;
    // §1 #4 #6 emit on new post/comment: notify opted-in members (not the author); IN_APP
    notifyNewPost(ctx: I_Context, communityId: string, authorId: string, postId: string): Promise<void>;
};
```

```typescript
// listMembers core (§1 #1 #2 #3) - membership from FR-COMM-001, online from the existing util
const now = Date.now();
const rows = await CommunityMemberModel
    .find({ communityId })                          // FR-COMM-001 roster (§1 #3)
    .populate({ path: 'user' })
    .lean();
let members = rows.map((row) => {
    const isOnline = resolveOnlineStatus(row.user?.lastOnline, now); // §1 #2 no new presence
    return { ...row.user, communityRole: row.role, isOnline };
});
if (filter?.onlineOnly) {
    members = members.filter(m => m.isOnline);       // §1 #6 online-only filter
}
members.sort((a, b) =>                               // §1 #1 online-first, then lastOnline desc
    Number(b.isOnline) - Number(a.isOnline)
    || new Date(b.lastOnline ?? 0).getTime() - new Date(a.lastOnline ?? 0).getTime());
const items = members.slice(page?.skip ?? 0, (page?.skip ?? 0) + (page?.limit ?? 20));
return { items, total: members.length };
```

```typescript
// notifyMemberJoined / notifyNewPost reuse the platform notification rail (§1 #4)
import { notificationCtr } from '#modules/notification/notification.controller.js';
import { E_NotificationChannel, E_NotificationEntityType, E_NotificationType } from '#modules/notification/notification.type.js';

async function notifyMemberJoined(ctx, communityId, joinerId) {
    const recipients = await CommunityMemberModel.find({ communityId }).lean();
    for (const r of recipients) {
        if (r.userId === joinerId) continue;                 // never notify the joiner (§1 #6)
        await notificationCtr.createNotificationWithSettings(ctx, {  // honours block/self/settings guards
            doc: {
                type: [E_NotificationType.COMMUNITY_MEMBER_JOINED],
                actorId: joinerId,
                targetId: r.userId,
                entityType: E_NotificationEntityType.COMMUNITY,
                entityId: communityId,
                channels: [E_NotificationChannel.IN_APP],     // §1 #4 bell only
                presentation: {
                    redirect: { kind: 'COMMUNITY', id: communityId },
                },
            },
        });
    }
}
```

```typescript
// ssl-be/src/modules/community/community.resolver.ts - paged members query (§1 #6)
export const communityResolver = {
    Query: {
        communityMembers: (_p: unknown, args: { communityId: string; filter?: I_MemberFilter; page?: I_MemberPage }, ctx: I_Context) =>
            communityMemberCtr.listMembers(ctx, args.communityId, args.filter, args.page), // §1 #1 #6
    },
    // join / createPost mutations (FR-COMM-001 / FR-COMM-002) call notifyMemberJoined / notifyNewPost after the write (§1 #4)
};
```

```tsx
// ssl-fe-user/src/shared/component/ui/online-indicator.tsx - reusable dot (§1 #8)
export function OnlineIndicator({ online, className }: { online?: boolean; className?: string }) {
    if (!online) return null;
    return <span className={cn('size-3 bg-green-600 rounded-full border border-white', className)} />;
}
```

---

## §4 - Acceptance criteria

1. Members listed online-first - `communityMembers(communityId)` returns the community's members with online members before offline ones, and within each group ordered by `lastOnline` descending (§1 #1). Test: `lists_members_online_first`.
2. Online from existing state - each member's online flag is `resolveOnlineStatus(member.lastOnline, now)` (15-minute window); no new presence field, writer, or heartbeat is introduced (§1 #2). Test: `online_derived_from_resolveOnlineStatus`.
3. Counts consistent with FR-COMM-001 - after a join the new member appears and `memberCount` increments; after a leave the member drops off and `memberCount` decrements; `memberCount` equals the `CommunityMember` row count (§1 #3). Test: `member_list_and_count_track_join_leave`.
4. Member-joined notification emitted - joining a community creates a `COMMUNITY_MEMBER_JOINED` `NotificationModel` row for each existing member except the joiner, on the `IN_APP` channel (§1 #4, #6). Test: `join_emits_member_joined_to_existing_members`.
5. New-post notification to opted-in - a new post or comment creates a `COMMUNITY_NEW_POST` notification for opted-in members (per the existing `followingPostAnnouncement` setting) and not for the author; an opted-out member receives none (§1 #4, #6). Test: `new_post_notifies_opted_in_members`.
6. Bell unread behaviour - community notifications increment the bell's `numberOfOtherUnRead` counter; opening the bell clears the badge while per-entry `readAt` state is retained (§1 #5). Tests: `community_notif_counts_in_bell` and fe `clears_badge_keeps_per_entry_read`.
7. Members query paged with online filter - `communityMembers` honours `page` (skip/limit) and `filter.onlineOnly` returns only currently-online members (§1 #6). Test: `members_query_paged_and_online_filtered`.
8. Phase-2 items absent - there is no per-community mute control and no activity-points field or counter anywhere in the members or notification path; opt-out is only the existing global notification settings (§1 #7, DEC-SSL-246). Test: `no_per_community_mute_or_activity_points`.
9. Reusable online indicator and bell entry - `OnlineIndicator` renders the green dot only when `online` is true and is used by the members list; a community notification renders in the existing notification list with a redirect to the community (§1 #8). Tests: fe `online_indicator_renders_only_when_online` and fe `community_notification_renders_in_bell`.

---

## §5 - Verification

```typescript
// ssl-be/src/modules/community/community-notify.test.ts (Vitest, mirrors notification.controller.test.ts)
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { communityMemberCtr } from './community-member.controller.js';
import { E_NotificationType } from '#modules/notification/notification.type.js';

describe('communityMemberCtr', () => {
    beforeEach(() => { vi.clearAllMocks(); /* in-memory Mongo / model + notificationCtr mocks */ });

    it('lists_members_online_first', async () => { /* AC1 - online members first, then lastOnline desc */ });
    it('online_derived_from_resolveOnlineStatus', async () => { /* AC2 - flag == resolveOnlineStatus(lastOnline); no new field */ });
    it('member_list_and_count_track_join_leave', async () => { /* AC3 - join adds + count++, leave removes + count--, count == rows */ });
    it('join_emits_member_joined_to_existing_members', async () => { /* AC4 - COMMUNITY_MEMBER_JOINED IN_APP row per member, not joiner */ });
    it('new_post_notifies_opted_in_members', async () => { /* AC5 - COMMUNITY_NEW_POST to opted-in only, not author */ });
    it('community_notif_counts_in_bell', async () => { /* AC6 - row lands in numberOfOtherUnRead via createNotificationWithSettings */ });
    it('members_query_paged_and_online_filtered', async () => { /* AC7 - skip/limit honoured; onlineOnly returns online only */ });
    it('no_per_community_mute_or_activity_points', async () => { /* AC8 - no mute arg, no points field in member/notify shapes */ });
});
```

```tsx
// ssl-fe-user/src/modules/community/community-members.test.tsx (Vitest + Testing Library)
import { describe, expect, it } from 'vitest';

describe('CommunityMembers + OnlineIndicator + bell', () => {
    it('online_indicator_renders_only_when_online', () => { /* AC9 - OnlineIndicator shows the green dot only when online=true */ });
    it('community_notification_renders_in_bell', () => { /* AC9 - a COMMUNITY_* notification renders in notification.page list with a community redirect */ });
    it('clears_badge_keeps_per_entry_read', () => { /* AC6 - opening the bell clears numberOfOtherUnRead; per-entry readAt retained */ });
});
```

Run: `cd ssl-be && pnpm vitest run community-notify` and `cd ssl-fe-user && pnpm vitest run community-members`. Both test files are listed in frontmatter `new_files` and are co-located with the module exactly as the existing notification tests are.

---

## §6 - Implementation skeleton

The §3 controller, resolver, and component shapes are the skeleton. The members path and the notify path each have one cross-cutting rule:

- Members (`listMembers` / `memberCount`): read the roster from FR-COMM-001's `CommunityMemberModel` filtered by `communityId` (§1 #3), compute each member's `isOnline` with `resolveOnlineStatus(member.lastOnline, now)` (§1 #2), apply the optional `onlineOnly` filter (§1 #6), sort online-first then `lastOnline` descending (§1 #1), then page with skip/limit.
- Notifications (`notifyMemberJoined` / `notifyNewPost`): on the relevant FR-COMM-001 / FR-COMM-002 event, iterate the recipients (existing members for a join; opted-in members for a new post), skip the actor, and call `notificationCtr.createNotificationWithSettings` with the new `COMMUNITY_*` type on the `IN_APP` channel (§1 #4) so the block, deleted-user, profile-complete, settings, and self-notify guards all apply.

Frontend: `online-indicator.tsx` is the extracted green dot (§1 #8); `community-members.tsx` renders the paged `communityMembers` query with an `OnlineIndicator` per row and an online-only toggle; `header.tsx` needs no new icon - community notifications flow through the existing bell and `useGetNotificationCounters` (`numberOfOtherUnRead`), and `notification.page.tsx` renders the new types with a redirect to the community (§1 #5).

---

## §7 - Dependencies

- Upstream: **FR-COMM-001** (community core - `Community`, `CommunityMember`, join/leave, membership gating; the roster and count read its rows), **FR-COMM-002** (posts/comments - the source of the new-post event that fires `notifyNewPost`).
- Reused backend: `resolveOnlineStatus` + `ONLINE_TIMEOUT_MS` (`user.pure.util.ts`) for online state and the `idx_users_online_last_online` index; the computed `isOnline` field set in `user.controller.ts findPaging`; `notificationCtr.createNotificationWithSettings` (`notification.controller.ts`) and `NotificationModel` (`notification.model.ts`) with the `IN_APP` channel and `presentation.redirect`.
- Reused frontend: the bell + unread badge in `header.tsx` fed by `useGetNotificationCounters` (`numberOfOtherUnRead`); `notification.page.tsx` for the notification list; the green-dot styling from `card-profile.tsx` (`profile?.isOnline` -> `bg-green-600 rounded-full`), now extracted into `online-indicator.tsx`; `cn` from `#shared/util/classname`.
- Related: the multilingual rule (DEC-SSL-245) - notification headlines and member-list labels reuse the existing i18n keys, no new translation system.
- Downstream: none in Release 2; the members list and the community bell are leaf social features over the community core.

---

## §8 - Example payloads

```json
{
  "data": {
    "communityMembers": {
      "items": [
        { "id": "u_882", "username": "AnnaAndTom", "isOnline": true,  "lastOnline": "2026-06-29T10:12:04Z", "communityRole": "MEMBER" },
        { "id": "u_417", "username": "SoloSam",    "isOnline": false, "lastOnline": "2026-06-28T22:40:00Z", "communityRole": "MEMBER" }
      ],
      "total": 2
    }
  }
}
```

```json
{ "type": ["COMMUNITY_MEMBER_JOINED"], "actorId": "u_882", "targetId": "u_401",
  "entityType": "COMMUNITY", "entityId": "c_55", "channels": ["IN_APP"],
  "presentation": { "headline": "AnnaAndTom joined Lisbon Couples", "redirect": { "kind": "COMMUNITY", "id": "c_55" } } }
```

```json
{ "type": ["COMMUNITY_NEW_POST"], "actorId": "u_417", "targetId": "u_401",
  "entityType": "COMMUNITY", "entityId": "c_55", "channels": ["IN_APP"],
  "presentation": { "headline": "New post in Lisbon Couples", "redirect": { "kind": "COMMUNITY", "id": "c_55" } } }
```

---

## §9 - Open questions

All client-facing points are decided (DEC-SSL-245, DEC-SSL-246). Deferred or noted:

- Notification headline copy (member-joined, new-post) is a content decision; the FR ships i18n placeholder keys and the client supplies translations (DEC-SSL-245).
- New-post fan-out for very large communities - v1 notifies opted-in members inline on the event; a batched or queued fan-out is a scale optimisation, not an MVP requirement, and does not change the contract.
- Per-community mute is explicitly Phase 2 (DEC-SSL-246); v1 opt-out is the existing global `followingPostAnnouncement` / `newMemberJoined` settings only.
- Whether the members section paginates by infinite scroll or numbered pages is a UI choice; the query is paged either way (skip/limit).

---

## §10 - Failure modes inventory

| Failure | Detection | Outcome | Recovery |
|---|---|---|---|
| A second presence system contradicts the profile dot | online derived from `resolveOnlineStatus(lastOnline)` only | one source of truth | none (AC2) |
| Members list shows someone who left | roster read from FR-COMM-001 `CommunityMember` rows | left member absent | none (AC3) |
| `memberCount` disagrees with the roster | count == `CommunityMember` row count | count matches list | none (AC3) |
| Offline members buried above online ones | online-first then `lastOnline` desc sort | live members on top | none (AC1) |
| Online-only filter returns offline members | `onlineOnly` filters on the computed flag | only online returned | none (AC7) |
| Unbounded member list on a big community | paged skip/limit | one page per request | next page (AC7) |
| Joiner notified of their own join | skip actor in fan-out | joiner gets none | none (AC4) |
| Post author notified of their own post | skip author in fan-out | author gets none | none (AC5) |
| Opted-out member still notified | `createNotificationWithSettings` honours settings | opted-out gets none | none (AC5) |
| Notification sent to a blocked or deleted user | reuse of block/deleted guards in the settings path | skipped silently | none (§3) |
| Parallel notification pipeline bypasses the bell | reuse `NotificationModel` + IN_APP only | rides the existing bell | none (AC4, AC6) |
| Badge stuck after opening the bell | existing open-clears-badge behaviour | unread -> 0 | reopen (AC6) |
| Per-entry read state lost on badge clear | per-entry `readAt` retained | individual state intact | none (AC6) |
| Per-community mute or activity points leak in | none added; only global settings | absent | none (AC8, DEC-SSL-246) |
| Online dot copied/diverges between surfaces | single `OnlineIndicator` component | one shared dot | none (AC9) |

---

## §11 - Implementation notes

- Online state is a read-time derivation, never a stored community field: `listMembers` computes each member's `isOnline` with `resolveOnlineStatus(member.lastOnline, now)` (the same 15-minute `ONLINE_TIMEOUT_MS` rule and the same `idx_users_online_last_online` index the rest of the platform uses), so a community can never disagree with the green dot on a profile card and there is nothing extra to keep warm.
- The roster and the count are views over FR-COMM-001. `listMembers` and `memberCount` read `CommunityMember` rows filtered by `communityId`, so join and leave from the community core are immediately reflected and the count is always the row count - no separate membership tally to drift.
- Ordering is explicit and testable: online members first (`Number(b.isOnline) - Number(a.isOnline)`), then most-recently-active (`lastOnline` descending), so the people a visitor could reach right now are at the top, deterministically.
- Notifications ride the existing rail by adding `E_NotificationType` members, not infrastructure. `notifyMemberJoined` and `notifyNewPost` call `createNotificationWithSettings`, which already enforces the self-notify, block, deleted-user, profile-complete, and per-setting opt-out checks, so a community event cannot bypass a block or a settings choice. Only the `IN_APP` channel is used, so the events land in the same bell and the same `numberOfOtherUnRead` counter as everything else.
- The unread badge and per-entry read state behave exactly as the platform already does (DEC-SSL-205-style): the bell count clears on open while each entry keeps its own `readAt`, because the community notifications are ordinary `NotificationModel` rows handled by the existing bell and `useGetNotificationCounters`.
- The online indicator is extracted, not reinvented: `online-indicator.tsx` is the green dot already inlined in `card-profile.tsx` (`bg-green-600 rounded-full`), so the members list and a profile card share one component and one style.
- Phase-2 scope is held out deliberately (DEC-SSL-246): no per-community mute, no activity points, no in-community admin panel. v1 opt-out is the existing global notification settings, so this FR adds the social layer without pulling in the deferred admin surface.

---

*End of FR-COMM-003.*
