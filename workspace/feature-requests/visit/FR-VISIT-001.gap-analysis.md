---
fr_id: FR-VISIT-001
analysis_date: 2026-07-14
analyzed_by: AI Code Review
scope: Compare FR spec (§1–§11) vs actual implementation in ssl-be/src/modules/profile-visit/
---

# Gap Analysis — FR-VISIT-001 Spec vs Implementation

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | Must fix before ship |
| 🟡 High | 4 | Should fix |
| 🟠 Medium | 3 | Nice to fix |
| 🔵 Low | 2 | Deferred ok |

---

## 🔴 Critical

### 1. Naming mismatch: `profileOwnerId` → `hostId`

**Spec says:** `profileOwnerId` (used consistently in §1, §3 model, resolver args, controller shapes, §8 payloads)
**Code uses:** `hostId`

The spec field name `profileOwnerId` was replaced with `hostId` everywhere (model, resolver args, controller, GraphQL). The GraphQL mutation `recordProfileVisit(hostId: String!)` takes `hostId` but the §8 example payload and all narrative clauses reference `profileOwnerId`.

**Action:**
- [ ] Decide: keep `hostId` (shorter, matches existing codebase pattern `host` virtual) and update the spec, OR rename code to `profileOwnerId` to match spec.
- **Recommendation:** Keep `hostId` — it's already in the code, shorter, and consistent with the `host` virtual. Update §1, §3, §8 in the spec.

---

## 🟡 High

### 2. No `expiresAt` / TTL index — soft-delete + cron instead

**Spec says (§1 #3, §3):** 30-day TTL via `expiresAt` field + MongoDB `expireAfterSeconds: 0` index. `recordVisit` sets `expiresAt = now + 30d` on upsert.

**Code does:** Soft-delete (`isDel: true`) with no TTL index. The model has no `expiresAt` field. There is no automatic MongoDB TTL pruning.

**Impact:** Without TTL or a cron job, soft-deleted visits accumulate forever. The spec's 30-day retention window (DEC-SSL-203) is not enforced.

**Action:**
- [ ] Add `expiresAt: Date` field to the model
- [ ] Add TTL index: `{ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_profile_visit_expires' }`
- [ ] In `recordProfileVisit`, set `expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)` on create AND on bump
- [ ] OR: keep soft-delete approach but add a cron job that hard-deletes `isDel: true` records older than 30 days (based on `lastVisitedAt`)

### 3. No `incognitoActive` flag in the API response

**Spec says (§1 #8, §8):** `profileVisitors` returns `incognitoActive: true` when caller is incognito, so the client can render explanatory UI.

**Code does:** Returns `{ success: true, message: 'Incognito mode — visitors hidden', result: { docs: [], totalDocs: 0, ... } }`. The client has no boolean flag to check — it must parse the message string.

**Action:**
- [ ] Add `incognitoActive: Boolean` to the GraphQL response type `T_Response_ProfileVisits`
- [ ] Return `incognitoActive: true` in the incognito path, `incognitoActive: false` (or omit) in the normal path

### 4. `visitorProfileType` determination logic is fragile

**Spec says (§1 #6, #10):** List shows profile-type icon (single or couple). Filter by profile type.

**Code does:** Determines type from `currentUser.partner1?.gender`:
```typescript
const visitorProfileType = currentUser.partner1?.gender
    ? (currentUser.partner1.gender as any === 'COUPLE' ? 'COUPLE' : 'SINGLE')
    : 'SINGLE';
```
This is fragile — it casts `gender` to compare with `'COUPLE'`. Gender is a user attribute, not a profile type. A couple profile is defined by having `partner2`, not by gender value.

**Action:**
- [ ] Determine `visitorProfileType` from the actual profile structure: check if `currentUser.partner2` exists → `COUPLE`, else → `SINGLE`. Or use the existing `accountType` field.

### 5. Missing Vitest test file

**Spec says (§5):** `profile-visit.test.ts` with 12 test cases.
**Code:** No test file exists at `ssl-be/src/modules/profile-visit/profile-visit.test.ts`.

**Action:**
- [ ] Write `profile-visit.test.ts` with all 12 test cases from §4 Acceptance Criteria

---

## 🟠 Medium

### 6. `readAt` stamping is manual (no auto-mark on query)

**Spec says (§1 #5, §11):** "the badge is the count of `readAt == null`, cleared by bulk-stamping `readAt` on the opened page"

**Code does:** Provides `markProfileVisitRead` (single) and `markAllProfileVisitsRead` (all) mutations. The client must explicitly call `markAllProfileVisitsRead` after fetching the list. This works but the spec implies it could be automatic when the list is fetched.

**Status:** Functionally correct — the mutations exist. The FR spec's §11 language "bulk-stamping `readAt` on the opened page" is ambiguous about whether the query side-effects or the client calls a mutation. The implementation chose explicit mutations, which is cleaner GraphQL practice.

**Action:**
- [ ] Clarify in spec §3 that `markAllProfileVisitsRead` is the mechanism (already in the resolver)
- [ ] Ensure the FE calls `markAllProfileVisitsRead` when the visitors page is opened

### 7. `deleteVisit` input shape differs from spec

**Spec says (§3 resolver):** `deleteVisit(visitorId: String!)` — delete by visitor ID.
**Code does:** `deleteProfileVisit(filter: Input_QueryProfileVisit!)` — delete by filter (typically `id`).

The spec's design lets the owner say "remove John's visit" by `visitorId`. The implementation requires the document `id` (the ProfileVisit record's own ID). The client must first find the document ID from the list before deleting.

**Action:**
- [ ] Either: add a `visitorId`-based delete overload, OR update the spec to reflect filter-based deletion
- [ ] The current approach is fine if the FE stores document IDs from the list query

### 8. Filter parameter not exposed as top-level `profileType`

**Spec says (§1 #10, §3):** `profileVisitors(filter, page)` with `filter?: { profileType?: string }`.
**Code does:** Uses `Input_QueryProfileVisit` which has `visitorProfileType`. This works but the naming doesn't match the spec's "profileType" shorthand.

**Action:**
- [ ] Align naming: spec uses `profileType`, code uses `visitorProfileType`. Pick one.

---

## 🔵 Low

### 9. No unique index on `(visitorId, hostId)` — dedupe is application-level

**Spec says (§3 model, §11):** Unique compound index `{ profileOwnerId: 1, visitorId: 1 }` to make dedupe a data invariant.

**Code does:** Index `{ visitorId: 1, hostId: 1 }` exists but is NOT unique (`unique: true` is missing). The dedupe is done in application code (the `recordProfileVisit` method queries for existing, then updates or creates). Without the unique constraint, a race condition could create duplicate rows.

**Action:**
- [ ] Add `unique: true` to the `idx_profile_visits_pair` index, OR document that the application-level dedupe is intentional (soft-delete makes unique index tricky — a deleted record would block re-insert)

### 10. No `E_NotificationType.PROFILE_VISIT` verification

**Spec says (§1 #11):** Notification type is `NEW_PROFILE_VISIT`.
**Code uses:** `E_NotificationType.PROFILE_VISIT`.

**Action:**
- [ ] Verify that `PROFILE_VISIT` exists in the notification type enum in `notification.type.ts`
- [ ] Align spec constant name with code

---

## What's Already Done Well ✅

| Item | Status |
|------|--------|
| `recordProfileVisit` — full-profile-only recording | ✅ Implemented |
| Self-visit guard (`visitorId === hostId`) | ✅ Implemented |
| Block guard (`isEitherSideBlocked`) | ✅ Implemented |
| Suspended/deleted/deactivated host check | ✅ Implemented |
| Incognito recording guard | ✅ Implemented |
| Incognito read reciprocity (`getProfileVisits` returns empty) | ✅ Implemented |
| Dedupe upsert logic (app-level) | ✅ Implemented |
| `markProfileVisitRead` / `markAllProfileVisitsRead` mutations | ✅ Implemented |
| `deleteProfileVisit` / `deleteProfileVisits` (soft delete) | ✅ Implemented |
| `setIncognito` mutation (stored on `user.settings.isIncognito`) | ✅ Implemented |
| `getProfileVisitCounter` (unread count) | ✅ Implemented |
| Server-side teaser gate (`isPaidMember` check) | ✅ Implemented |
| `hydrateUserMedia` reuse for blur | ✅ Implemented |
| Username masking (`'Member'`) for free users | ✅ Implemented |
| Visitor profile filtering (invisible profiles dropped) | ✅ Implemented |
| `newest-first` sort order | ✅ Implemented |
| Notification emission on new/resurfaced visit | ✅ Implemented |
| Notification suppression on deduped repeat visit | ✅ Implemented |
| GraphQL schema complete (all 6 mutations + 2 queries) | ✅ Implemented |

---

## FE Module Status

The `ssl-fe-user/src/modules/visitor/` directory **does not exist yet**. No FE implementation has been started. Required files per the spec:

- [ ] `ssl-fe-user/src/app/[locale]/(main)/visitors/page.tsx` — visitors page route
- [ ] `ssl-fe-user/src/modules/visitor/visitor-list.tsx` — list component
- [ ] `ssl-fe-user/src/modules/visitor/visitor.hook.tsx` — data hook
- [ ] `ssl-fe-user/src/modules/visitor/incognito-toggle.tsx` — incognito toggle
- [ ] `ssl-fe-user/src/modules/visitor/visitor.test.tsx` — FE tests
- [ ] `ssl-fe-user/src/shared/layout/main/header.tsx` — eye icon + badge (modify)
- [ ] `ssl-fe-user/src/shared/util/profile.ts` — helpers (modify)

---

*End of gap analysis.*
