---
fr_id: FR-COMM-003
audited: 2026-06-29
verdict: PASS (after revision)
score_pre_revision: 8.5/10
score_post_revision: 9.5/10
issues_resolved: 2
needs_human: 0
template: engineering-spec@1
rubric: audit_rubric@2.0
---

## §1 - Verdict summary

FR-COMM-003 specifies the social layer over the community core: a members section with an online indicator (online-first, then most-recently-active), and community events (member joined, new post/comment) surfaced in the existing notification bell - both by reuse, not new infrastructure. Scope: 8 §1 normative clauses (7 MUST, #8 SHOULD), 7 §2 rationale paragraphs, a §3 contract (notification-enum additions, member-controller shapes, a concrete `listMembers` core, the notify functions, the resolver query, and the `OnlineIndicator` component), 9 §4 ACs, a stub-body Vitest + RTL suite in §5, and §6-§11.

Frontmatter carries the full FR-CLICK-013 key set; depends_on: [FR-COMM-001, FR-COMM-002] is the correct forward dependency (the roster reads 001's `CommunityMember`; the new-post event comes from 002). All 11 sections present and non-empty, plain keyboard characters throughout. The two §5 test files (`community-notify.test.ts`, `community-members.test.tsx`) are declared in `new_files`, so TRACE-003 passes. Phase-2 exclusions are honoured: §1 #7 plus §2 plus §11 state no per-community mute and no activity points, with opt-out routed through the existing global notification settings (DEC-SSL-246).

## §2 - Findings

### ISS-001 - notification enum additions pointed at the wrong file in modified_files (resolved)
§1 #4 and §3 add `COMMUNITY_MEMBER_JOINED` + `COMMUNITY_NEW_POST` to `E_NotificationType` and `COMMUNITY` to `E_NotificationEntityType` / `E_RedirectType`. All three enums live in `ssl-be/src/modules/notification/notification.type.ts` (verified) and are mirrored in `ssl-be/src/modules/notification/notification.graphql` (verified: the GraphQL schema declares the same three enums). The FR's `modified_files` instead listed `notification.model.ts`, which does not define these enums. §3 already showed the correct file (`notification.type.ts`). Resolved by replacing `notification.model.ts` with `notification.type.ts` in `modified_files` and adding `notification.graphql` (the enum has to be added in both the TS source and the GraphQL schema for the new values to resolve end to end). Also corrected the matching `sub_tasks` line.

### ISS-002 - sub_task description named the wrong enum file (resolved)
The 2.0h notification sub-task said "notification.model.ts - add ... E_NotificationType members + COMMUNITY entity/redirect types". Updated to name `notification.type.ts` + `notification.graphql` and to spell out that the TS enums and their mirrored GraphQL enums both change, so the implementer does not edit the model file by mistake.

## §3 - Resolution

TRACE-001 holds for every §1 MUST: #1->AC1, #2->AC2, #3->AC3, #4->AC4/5, #5->AC6, #6->AC7 (and AC4/5 for the emit half), #7->AC8. #8 is a SHOULD (reusable `OnlineIndicator`) and is additionally traced by AC9, which is allowed. TRACE-002 holds: every AC names a backing test (`lists_members_online_first`, `online_derived_from_resolveOnlineStatus`, `member_list_and_count_track_join_leave`, `join_emits_member_joined_to_existing_members`, `new_post_notifies_opted_in_members`, `community_notif_counts_in_bell` + fe `clears_badge_keeps_per_entry_read`, `members_query_paged_and_online_filtered`, `no_per_community_mute_or_activity_points`, and the two fe indicator/bell tests). TRACE-003 holds: both test files are in `new_files`. The reuse anchors are real in the repo: `resolveOnlineStatus` is in `user.pure.util.ts` and `createNotificationWithSettings` is in `notification.controller.ts`, exactly as cited; `I_NotificationRedirect.kind` is typed `E_RedirectType`, so adding `COMMUNITY` there is the correct way to type the `redirect: { kind: 'COMMUNITY' }` shown in §3 and §8. QA: §9 lists deferred items (headline copy, large-community fan-out, per-community mute, pagination style), §2 supplies the alternatives, `risk_if_skipped` is concrete, no vanity metric.

Non-blocking note for the implementer (not a defect): §1 #6's emit requirement is satisfied by `notifyMemberJoined` / `notifyNewPost`, which are *called from* FR-COMM-001's join mutation and FR-COMM-002's createPost mutation (stated in the §3 resolver comment). Because this FR depends_on both, that wiring is in scope and ordered correctly, but the implementer must remember to add those two call sites into the already-built 001/002 mutations rather than only defining the functions. The §5 test bodies are stubs (AC-mapped comments); that is acceptable for the draft -> ready_to_implement gate, where TRACE checks the test *names* and AC mapping, with coverage enforced later by `coverage-gate-audit`.

No open blockers, no needs_human. **Score = 9.5/10.** Set `status: ready_to_implement`. Half a point withheld because the cross-FR notify call sites live in another FR's files, a coupling that is correct but easy to drop in implementation.

---

*End of FR-COMM-003 audit.*
