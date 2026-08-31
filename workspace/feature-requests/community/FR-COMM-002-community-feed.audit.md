---
fr_id: FR-COMM-002
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

FR-COMM-002 specifies the community feed over FR-COMM-001: posts (text + image + emoji), comments, per-user emoji reactions, post-media moderation hidden until APPROVED, gallery-limit reuse, author-or-moderator soft-delete, a 12-month TTL, and a newest-first hydrated feed, with every gate on the server. Scope: 10 §1 normative clauses (all MUST), 7 §2 rationale paragraphs, a full §3 API contract (two models + controller + GraphQL sketch), 11 §4 ACs, an 11-test Vitest suite plus a client RTL note in §5, and §6-§11.

Frontmatter carries the full FR-CLICK-013 key set plus source provenance; depends_on: [FR-COMM-001] is the correct forward dependency. All 11 sections present and non-empty. The emoji in §5/§8 are payload/test-fixture content (post bodies, reaction payloads), not prose, so the plain-keyboard rule is not violated. Both §5 test files (`community-post.test.ts`, `community-feed.test.tsx`) are declared in `new_files`, so TRACE-003 passes. Phase-2 exclusions are honoured: no private/approval, no points, no themes; moderator authority reuses `community.ownerIds` rather than a new in-community admin role (§11), and post-body search is explicitly deferred to a later FR (§9, DEC-SSL-243).

## §2 - Findings

### ISS-001 - `E_UploadEntity.COMMUNITY` consumed but not named in dependencies (resolved)
§1 #3, §3, and §6 route post media through `ModerationMedia` with `entity` = "the community-post upload entity", i.e. `E_UploadEntity.COMMUNITY`. That member does not exist in the live `entity.ts` and is introduced by FR-COMM-001 (whose `modified_files` now declares `entity.ts`). The dependency was real but implicit. Resolved by naming `E_UploadEntity.COMMUNITY` explicitly in §7 Upstream and clarifying ownership: FR-COMM-001 adds the enum member, this FR consumes it and does not re-declare the enum file (avoiding duplicate ownership of the same change across two FRs). No `modified_files` edit needed here; the consume-not-own relationship is the correct model. Traceability: §1 #3 -> AC #4/#6 -> §5 `media_hidden_until_approved` / via the entity discriminator.

### ISS-002 - §1 #9 / AC #11 promised comment-count + reaction-count hydration that §3 did not compute (resolved)
§1 #9 ("MUST hydrate, per post, the author profile, the reaction counts, and the comment count") and AC #11 both promised three hydrated fields, but the §3 `listFeed` populated only `author`, and the §5 `feed_newest_first_hydrated` test asserted only `feed.docs[0].author`. The reaction count is derivable from the embedded `reactions` array, but the comment count requires a grouped count of live `CommunityPostComment` rows that the spec did not show, leaving the AC under-specified and under-tested. Resolved by adding the per-page comment-count aggregation and the `reactionCount`/`commentCount` projection to §3 `listFeed`, and by extending the §5 test to seed one comment and one reaction on the newest post and assert `reactionCount === 1` and `commentCount === 1`. AC #11 is now fully backed.

## §3 - Resolution

TRACE-001 holds for every §1 MUST: #1->AC1/2, #2->AC3, #3->AC4, #4->AC5, #5->AC6, #6->AC7, #7->AC8/9, #8->AC10, #9->AC11, #10->AC2. TRACE-002 holds: every AC carries an explicit `[verified by §5 <test>]` citation, and AC #11's named test now actually asserts all three hydrated fields. TRACE-003 holds: every §5 path is in `new_files`. The gate design is sound and matches the repo: `authnCtr.isPaidMember` and `getUserFromSession` exist as referenced; `aiModerationCtr.moderateImage` exists under `moderation/ai-moderation/`; the `deletedAt`/`expiresAt` + TTL idiom is a real platform pattern. QA: §9 records deferred items (richer reaction palette, post-body search, video), §2 supplies the "why not reuse message.model.ts / why server-side / why TTL" alternatives, `risk_if_skipped` is concrete, no vanity metric. The TTL test reads `schema.path('expiresAt').options.index.expireAfterSeconds` - a reasonable structural assertion given the model in §3.

No open blockers, no needs_human. **Score = 9.5/10.** Set `status: ready_to_implement`. Half a point withheld for two implementation-time details the implementer must wire (the `aiModerationCtr` / gallery-limit import surface, and the exact APPROVED-media projection shape), which are correctly described but not pinned to a single repo symbol in §3.

---

*End of FR-COMM-002 audit.*
