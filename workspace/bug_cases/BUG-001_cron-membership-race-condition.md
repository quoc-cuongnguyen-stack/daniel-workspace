# BUG-001: Cron Job Race Condition — Membership Downgrade vs Rebill

> **Status:** ✅ Fixed
> **Date Found:** 2026-05-11
> **Date Fixed:** 2026-05-11
> **Project:** SSL (ssl-be)
> **Severity:** 🔴 Critical

---

## 🔍 Description

A race condition in the SSL-BE cron system where `downgradeExpiredMemberships` and `rebillExpiringMemberships` both run at midnight. When downgrade runs first, it removes the `PAID_MEMBER` role that rebill depends on, preventing automatic subscription renewal. This causes paying users to lose their membership unexpectedly.

## 🔄 Reproduction Steps

1. User has an active paid membership expiring at midnight
2. Both cron jobs trigger at midnight (00:00)
3. `downgradeExpiredMemberships` executes first
4. It removes the `PAID_MEMBER` role from the user
5. `rebillExpiringMemberships` runs next but can't find the user (no `PAID_MEMBER` role)
6. User's subscription is not renewed

**Expected behavior:** User's subscription is automatically renewed before any downgrade check
**Actual behavior:** User gets downgraded, then the rebill job can't find them to renew

## 🧠 Root Cause Analysis

Both cron jobs are scheduled at the same time (midnight) with no ordering guarantee. The `rebillExpiringMemberships` job depends on the `PAID_MEMBER` role being present, but `downgradeExpiredMemberships` removes it before rebill can process the user.

## 🔧 Fix Applied

Schedule `rebillExpiringMemberships` to run **before** `downgradeExpiredMemberships`, or add proper synchronization between the two jobs to ensure rebill processes users first.

## 📝 Lessons Learned

- Cron jobs that operate on the same data must have explicit ordering
- Don't assume cron execution order when scheduled at the same time
- Add guards to prevent cascading failures between dependent cron jobs

## 🔗 References

- Knowledge item: [Cron Membership Race Condition](/Users/daniel/.gemini/antigravity-ide/knowledge/cron_membership_race_condition/artifacts/bug_analysis.md)
