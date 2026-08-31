---
fr_id: FR-COMM-004
audited: 2026-06-29
verdict: PASS (after revision)
score_pre_revision: 7.5/10
score_post_revision: 9.0/10
issues_resolved: 4
needs_human: 0
template: engineering-spec@1
rubric: audit_rubric@2.0
---

## §1 - Verdict summary

FR-COMM-004 specifies the admin governance surface for Communities: a platform-managed community tag type on the existing Tag admin, a community list screen, community-post moderation routed through the existing `ModerationMedia` queue, and route registration under the existing dashboard layout, with every admin action authorized on the server. Scope: 7 §1 normative clauses (6 MUST, #7 SHOULD), 6 §2 rationale paragraphs, a §3 contract (the two enum additions, the admin resolver queries, the `DataTable` list, the moderation page, and the route registration), 9 §4 ACs, a §5 split between a concrete fe-admin RTL file and a set of server-side assertions, and §6-§11.

Frontmatter carries the full FR-CLICK-013 key set; depends_on: [FR-COMM-001, FR-COMM-002] is the correct forward dependency (the admin list reads 001's `Community`; post moderation reads 002's posts/media). All 11 sections present and non-empty, plain keyboard characters throughout. Phase-2 exclusions are explicit in §1 #5, §2, §9, and §11 (no per-community panel, approval workflow, points, or themes builder), citing DEC-SSL-246. The FR is correctly framed as mostly-reuse: the Tag admin, the media-moderation modals/hooks, `DataTable` + `useListQueryState`, and the dashboard layout are all existing surfaces.

## §2 - Findings

### ISS-001 - the server admin guard `authzCtr.requireAdmin` does not exist in the repo (resolved)
§1 #6, §3, AC #9, §5, §10, and §11 all invoked `authzCtr.requireAdmin(context)` as the admin-session guard. A repo scan found no `authzCtr` and no `requireAdmin` anywhere in `ssl-be`. The platform's real admin gate is `isAdminContext(context)` from `#shared/auth-context/index.js`, used by `user-admin.service.ts` and `user-read.policy.ts`, which throw FORBIDDEN when it returns false. Mandating a non-existent symbol would make §1 #6 a clause with no real backing (and AC #9's test would target a fictional function). Resolved by replacing every `authzCtr.requireAdmin` reference with a local `requireAdmin` helper that calls the existing `isAdminContext` and throws a FORBIDDEN `throwError`, and updating §1 #6, §3 (with the import + helper), AC #9, the §5 assertion, the §6 skeleton, the §10 failure row, and the §11 note to match. The guard is now real reuse. Traceability: §1 #6 -> AC #9 -> §5 `admin_queries_require_admin_session`.

### ISS-002 - server-side §5 tests were dangling (no host file) - TRACE-003 (resolved)
§5 cited five server-side tests (`curated_and_user_tags_coexist`, `post_moderation_reason_required`, `community_media_uses_existing_queue`, `routes_registered_under_dashboard`, `admin_queries_require_admin_session`) backing AC #2/#5/#6/#7/#9, but `new_files` declared only the fe-admin test `community-list.test.tsx`; the backend tests had no file, which fails TRACE-003 (test name with no file). Resolved by adding `ssl-be/src/modules/community/community-admin.test.ts` to `new_files` and pointing the §5 server-side block at it explicitly. All §5 test paths now resolve to a declared new file.

### ISS-003 - E_TagType enum addition pointed at the wrong file in modified_files (resolved)
§1 #1 and §3 add `COMMUNITY` to `E_TagType`. That enum is defined in `ssl-be/src/modules/tag/tag.type.ts` and mirrored in `ssl-be/src/modules/tag/tag.graphql` (both verified); `tag.model.ts` only imports it via `Object.values(E_TagType)` and needs no edit. The FR's `modified_files` listed `tag.model.ts` (the wrong file) and omitted the two files that actually change. Resolved by replacing `tag.model.ts` with `tag.type.ts` and `tag.graphql` in `modified_files`, and updating §3, the sub_tasks, and §11 to name both the TS enum and the mirrored GraphQL enum.

### ISS-004 - double-ownership of the E_UploadEntity.COMMUNITY enum change (resolved)
§3 showed the full `E_UploadEntity` enum with `COMMUNITY` added as if this FR owned the change, while FR-COMM-001 (which now declares `entity.ts` in its modified_files) also adds it and FR-COMM-002 consumes it. Two FRs owning the same one-line enum change is an avoidable conflict. Resolved by reframing this FR as the consumer: §3, §7, and §11 now state FR-COMM-001 introduces `E_UploadEntity.COMMUNITY` and this FR consumes it as the moderation-queue discriminator without re-declaring the enum file. The enum change is now owned in exactly one place (001), and this FR remains the sole owner of the `E_TagType.COMMUNITY` change.

## §3 - Resolution

TRACE-001 holds for every §1 MUST: #1->AC1/2, #2->AC3/4, #3->AC5/6, #4->AC7, #5->AC8, #6->AC9. #7 is a SHOULD (reuse ConfirmDialog / notes+reason modals / moderation log) and is legitimately untraced under the SHOULD exemption, though AC #5 exercises the same modals. TRACE-002 holds: every AC carries a "Cites §5 <test>" pointer. TRACE-003 now holds: the fe-admin test is in `new_files` and the server-side tests are hosted by the newly declared `community-admin.test.ts`. The reuse anchors are real: `E_TagType` (tag.type.ts + tag.graphql), `isCustom` flag, `E_UploadEntity` (entity.ts), `ModerationMedia` + `useApprove/RejectModerationMedia`, `DataTable`, `useListQueryState`, and `isAdminContext` all exist as cited. QA: §9 records the deferred items, §2 supplies the "why reuse not rebuild" alternatives per surface, `risk_if_skipped` is concrete, no vanity metric. The `phase2_items_absent` fe test (AC #8) is a light static guard, which is acceptable as a scope-creep tripwire at this gate.

Non-blocking note for the implementer (not a defect): the §5 fe-admin test file still contains one placeholder body (`community_tag_type_in_admin` asserts `true`), with the real Tag-admin assertion described in prose; that is acceptable at the draft -> ready_to_implement gate (the test name and AC mapping are present; coverage is enforced later by `coverage-gate-audit`), but the implementer should flesh it out when building the Tag-form change.

No open blockers, no needs_human. **Score = 9.0/10.** Set `status: ready_to_implement`. A full point withheld: this FR had the most fictional-symbol drift of the four (the invented admin guard plus two enum-file mismatches), all now corrected, but the residual placeholder test body and the prose-only Tag-admin assertion keep it just below the 001/002/003 line.

---

*End of FR-COMM-004 audit.*
