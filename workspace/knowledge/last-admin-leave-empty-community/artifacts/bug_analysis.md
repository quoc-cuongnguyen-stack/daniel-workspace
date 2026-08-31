# BUG-136 analysis

## Symptom
Departed creator of an empty private community still saw feed + Moderator Panel.

## Cause
`createdById` treated as membership; leave orphaned instead of deleting when empty. Count failures were treated as 0; two last-staff leaves could race past the pre-write count.

## Fix
- Tombstone the community whenever the final ADMIN/MODERATOR leaves, is removed, or is demoted.
- Fail closed when member/staff counts fail; re-check staff after a leave that believed others remained.
- `updateCommunity` writes only the authorized community id.
- Never auto-promote a regular member; reject self kick/ban.
- Soft-delete memberships/applications after tombstoning so join/apply/review cannot revive it.
- Access + notifications require live ADMIN/MOD membership rows.
