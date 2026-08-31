# COMM - Communities / Forum MVP (Release 2)

The Communities module is the Release 2 half of the SSL round-1 backlog. It is greenfield in ssl-be (a new `src/modules/community/` module) and adds new pages in ssl-fe-user plus a small admin surface in ssl-fe-admin. Everything reuses existing platform mechanisms (paid gating, media moderation, notifications, i18n) rather than rebuilding them.

See `../BACKLOG.md` for the cross-module index, `../DECISIONS.md` for the DEC-SSL decisions, and `../manifest.json` for machine-readable state.

## FR catalog

| FR | Title | Effort | Depends on | Blocks |
|---|---|---:|---|---|
| FR-COMM-001 | Communities core: model, create/join/leave, My Communities, paid-member create gating, name + tag + location search | 28h | - | 002, 003, 004 |
| FR-COMM-002 | Community feed: posts (text/image/emoji), comments, emoji reactions, media via ModerationMedia + AI moderation, author/moderator delete, 12-month auto-delete | 30h | 001 | 003, 004 |
| FR-COMM-003 | Members section + online indicator + community bell notifications | 14h | 001, 002 | - |
| FR-COMM-004 | Community admin: platform-managed tags (E_TagType.COMMUNITY) + community list + post moderation surfaces in ssl-fe-admin | 16h | 001, 002 | - |

Total: 88h. All four are at `ready_to_implement` (audit 9.0 to 9.5 / 10).

## Build order

```
FR-COMM-001  (core: models, membership, search, the E_UploadEntity.COMMUNITY enum)
      |
      v
FR-COMM-002  (feed: posts, comments, reactions, media moderation, auto-delete)
      |
      +--> FR-COMM-003  (members, online indicator, bell notifications)
      |
      +--> FR-COMM-004  (admin: tags + post moderation surfaces)
```

001 first (it carries the models the others build on, plus the `E_UploadEntity.COMMUNITY` enum member). 002 next (the feed). 003 and 004 can then run in parallel.

## Reused, not rebuilt

- Paid gating: `authnCtr.isPaidMember(context)` (ssl-be `src/modules/authn/authn.controller.ts`) gates create, post, and comment (DEC-SSL-240).
- Media: post and header media route through the existing `ModerationMedia` model + AI moderation queue (`src/modules/moderation/`) under a new `E_UploadEntity.COMMUNITY` (DEC-SSL-244). Media limits reuse the existing gallery limits.
- Notifications: community events reuse the `Notification` model + IN_APP bell (`src/modules/notification/`); the new event types live in `notification.type.ts`.
- Online status: reuse `resolveOnlineStatus` (`src/modules/user/user.pure.util.ts`).
- Admin: extend the existing Tag CRUD and reuse the media-moderation screens in ssl-fe-admin; the per-community admin panel is Phase 2.
- i18n: all new copy via next-intl (DEC-SSL-245).

## Out of scope this round (Phase 2, DEC-SSL-246)

Community map (MapTiler), private communities with application + moderator approval, activity points, premade themes with the step-based builder, and the full in-community admin panel. Each FR names the relevant Phase 2 items as explicit non-goals.

## New backend enum members (prerequisites)

- `E_UploadEntity.COMMUNITY` - owned by FR-COMM-001 (so post/header media join the existing moderation queue).
- `E_TagType.COMMUNITY` - owned by FR-COMM-004 (so curated community tags coexist with user tags).
