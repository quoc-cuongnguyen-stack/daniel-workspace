---
fr_id: FR-COMM-001
audited: 2026-06-29
verdict: PASS (after revision)
score_pre_revision: 8.0/10
score_post_revision: 9.5/10
issues_resolved: 4
needs_human: 0
template: engineering-spec@1
rubric: audit_rubric@2.0
---

## §1 - Verdict summary

FR-COMM-001 specifies the greenfield Communities core: the `Community` + `CommunityMember` model, paid-only create gated on the server, join/leave on open communities, a My Communities view, header-image moderation through the existing pipeline, and name+tags+location search, all reusing the platform i18n. Scope: 11 §1 normative clauses (1 SHOULD at #11), 7 §2 rationale paragraphs, a full §3 API contract (type/controller/resolver), 11 §4 ACs, a 9-test Vitest suite plus a client RTL note in §5, and §6-§11 (skeleton, deps, payloads, open questions, 13-row failure inventory, notes).

Frontmatter carries the full FR-CLICK-013 key set (id, title, module, priority, status, verify, phase, milestone, slice, owner, created, related_frs, depends_on, blocks, source_pages, source_decisions, language, service, new_files, modified_files, allowed_tools, disallowed_tools, effort_hours, sub_tasks, risk_if_skipped) plus source provenance. All 11 sections present and non-empty. Plain keyboard characters throughout (the emoji in §5/§8 of sibling FRs are payload content, not present here). The greenfield community models, resolvers, and both test files are declared in `new_files`, so TRACE-003 passes for every §5 test path.

The depends_on chain is correct: this FR depends on nothing and blocks 002/003/004. The Phase-2 exclusions (map, private+approval, points, themes, full admin panel) are stated as explicit non-goals in §1 #10, §9 Out of scope, and §11, citing DEC-SSL-246 / DEC-SSL-241.

## §2 - Findings

### ISS-001 - `E_UploadEntity.COMMUNITY` used but its enum file not in modified_files (resolved)
§1 #5, §3, and §7 route the header image through `ModerationMedia` with `entity: E_UploadEntity.COMMUNITY`, but that member does not exist in `ssl-be/src/shared/typescript/entity.ts` (verified: the live enum has USER/EVENT/CONVERSATION/CATALOGUE/GALLERY/CLUB/DESTINATION, no COMMUNITY), and the FR's `modified_files` did not list that file. Per the COMM-specific intake rule, added `ssl-be/src/shared/typescript/entity.ts` to `modified_files` so the enum addition is a declared change. Traceability: §1 #5 -> AC #7 -> §5 `header_image_enters_moderation`.

### ISS-002 - §1 #9 mandated an audit line, but SSL has no audit primitive (resolved)
§1 #9 read "MUST emit an audit line on create, join, and leave"; §3 called a helper `emitAudit(context, ...)`. A repo scan found no `emitAudit` / `auditCtr` / `AuditLog` and no module logger in the comparable `report/` module. A MUST that needs a non-existent audit module would be a dangling normative clause (and any test would fail TRACE-003 for lack of a target). Resolved by splitting #9: the GraphQL-operations half stays MUST; the audit half is downgraded to SHOULD framed as best-effort `logger.info` structured logging, with a note that a real audit pipeline is a separate cross-cutting FR. Updated the three §3 call sites from `emitAudit(...)` to `logger.info(...)`. SHOULD clauses are TRACE-001-exempt, so no dangling MUST remains.

### ISS-003 - §1 #9 (GraphQL ops MUST) had no §4 AC citation (TRACE-001) (resolved)
After the #9 split, the surviving "MUST expose `createCommunity` / `joinCommunity` / `leaveCommunity` / `community(slug)` / `communities` / `myCommunities`" clause was not cited by any AC. Most ops are exercised indirectly (create in AC#1, join AC#4, leave AC#5, communities AC#9, myCommunities AC#6), but `community(slug)` was untested and the clause uncited. Added "(§1 #9)" to AC #1 and a `community(slug)` read-back assertion to the `paid_member_can_create` §5 test. Traceability: §1 #9 -> AC #1 -> §5 `paid_member_can_create`.

### ISS-004 - §1 #7 (i18n MUST / MUST NOT separate store) had no §4 AC citation (TRACE-001) (resolved)
§1 #7 ("MUST be multilingual by reusing the existing i18n ... MUST NOT introduce a separate translation store") was a normative clause with no downstream AC. Folded it into AC #10's negative-assertion (which already verifies "no Phase-2 op"): AC #10 now also asserts no community-specific translation store/model is introduced, citing (§1 #7, #10), verified by `phase2_items_absent`. Traceability closed.

## §3 - Resolution

TRACE-001 now holds for every §1 MUST: #1->AC3, #2->AC1/2, #3->AC4/5, #4->AC6, #5->AC7/11, #6->AC9, #7->AC10, #8->AC4/5/8, #9->AC1, #10->AC10. #11 is a SHOULD (Tag-taxonomy reuse) and is legitimately untraced per TRACE-001's SHOULD exemption. TRACE-002 holds: every AC names a §5 test (or the client RTL note for AC #11). TRACE-003 holds: all §5 test paths (`community.test.ts`, `community.test.tsx`) are in `new_files`. QA checks pass: §9 has an explicit Out of scope, §5 alternatives are implied by §2's "why not X" paragraphs and the failure inventory, `risk_if_skipped` is concrete, and no vanity metric appears (the FR has no Success Metrics section in the engineering-spec template, which is consistent with the FR-CLICK-013 precedent). One residual non-blocking note for the implementer: the moderation import path in §3 (`#modules/moderation/index.js`) and `aiModerationCtr` exposure are implementation details to wire when the module is built; the underlying controllers (`moderationMediaCtr`, `authnCtr.isPaidMember`, `aiModerationCtr`) all exist in the repo.

No open blockers, no needs_human. **Score = 9.5/10.** Set `status: ready_to_implement`. Half a point withheld only because the audit-trail story is best-effort logging rather than a real audit primitive, which is a deliberate platform gap deferred to a future cross-cutting FR, not a defect in this spec.

---

*End of FR-COMM-001 audit.*
