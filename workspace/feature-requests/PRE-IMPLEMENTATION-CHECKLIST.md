# SSL round-1 - pre-implementation checklist

The gate between authoring and building. When every box here holds, Release 1 can start. Generated 2026-06-29 from the audited FR corpus.

## Corpus state

- 8 FRs, all at `ready_to_implement`, audit 9.0 to 9.5 / 10, each with a `.audit.md`.
- Coherence checked 2026-06-29: dependency cycles 0, dangling references 0, reciprocity errors 0, slice order valid.
- Effort: 146h total (Release 1 58h, Release 2 88h), reuse-aware estimates.
- Artifacts in `docs/feature-requests/`: `BACKLOG.md` (index), `DECISIONS.md` (DEC-SSL), `manifest.json` (fr-manifest@2 machine state), the 8 FR + 8 audit files, and `community/README.md`.

## Build order

Release 1 first; the four quick wins are independent and can run in any order or in parallel:

1. FR-AGEV-001 (age-verify overlay) - 10h
2. FR-GUEST-001 (guestbook gating) - 12h
3. FR-CHAT-001 (chat edit/delete/media) - 16h
4. FR-VISIT-001 (profile visit center) - 20h

Then Release 2, in dependency order:

5. FR-COMM-001 (community core) -> 6. FR-COMM-002 (feed) -> 7. FR-COMM-003 (members/notifications) and 8. FR-COMM-004 (admin) in parallel.

## Repo commands (all pnpm)

- ssl-be: `pnpm dev` (runs migrations + starts), `pnpm test` (vitest run), `pnpm test:watch`, `pnpm build`, `pnpm lint`.
- ssl-fe-user: `pnpm dev`, `pnpm generate` (graphql-codegen - run after any ssl-be schema change to refresh typed hooks), `pnpm build`, `pnpm lint`.
- ssl-fe-admin: `pnpm dev`, `pnpm generate` (graphql-codegen), `pnpm build`, `pnpm lint`.

## Prerequisites and open items

- [ ] Backend enum `E_UploadEntity.COMMUNITY` added (owned by FR-COMM-001) so community media joins the existing ModerationMedia queue.
- [ ] Backend enum `E_TagType.COMMUNITY` added (owned by FR-COMM-004) so curated community tags coexist with user tags.
- [ ] Client delivers the age-verify multilingual banner and CTA copy for FR-AGEV-001. This is the only external blocker; the "18?" icon is language-neutral, so the overlay and the owner-vs-visitor logic can be built first and the strings dropped in. Everything else is resolved in `DECISIONS.md`.
- [ ] Frontend test script: ssl-fe-user and ssl-fe-admin have no `test` script in package.json. Add one (vitest) or run `pnpm exec vitest`, since the FR §5 tests prescribe Vitest in those repos. ssl-be already has `pnpm test`.
- [ ] After each ssl-be GraphQL change, run `pnpm generate` in the affected frontend before wiring UI.

## Execution protocol (one FR at a time)

Per the CyberOS ship flow and the self-verify loop: take one FR to completion before the next, on a dedicated branch (for example `auto/ssl-r1-visit`).

1. Read the FR. The §1 clauses are the contract; the `sub_tasks`, §5 tests, and §6 skeleton are the breakdown.
2. Implement, writing the §5 tests as you go.
3. Verify: `pnpm test` (and `pnpm exec vitest` in the frontend), `pnpm lint`, then commit.
4. Move the FR `status` through `implementing -> ready_to_review -> reviewing -> ready_to_test -> testing -> done`, and update `manifest.json`.
5. Definition of done for an FR: every §4 acceptance criterion passes via its §5 test, lint is clean, and no §1 MUST is unmet.

## After each release

Write a `SLICE-<N>-HANDOFF.md` in the relevant module folder (what shipped, the evidence, the operator steps, any gating decisions). This is a post-build artifact, not authored now.
