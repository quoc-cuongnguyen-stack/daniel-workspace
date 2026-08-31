# BUG-098: Needs-administrator banner wrong gate

> **Status:** 🟡 Investigating
> **Date Found:** 2026-08-20
> **Date Fixed:**
> **Project:** SSL
> **Severity:** 🟡 Medium

---

## 🔍 Description

The "This community needs an administrator" UI appears while the viewer is already an active community member. It should only show when the community has no administrator and the current user still has an active membership row.

## 🔄 Reproduction Steps

1. Open a community feed as an active member.
2. Observe whether the needs-administrator banner is visible.

**Expected:** Banner only when status is orphaned and viewer has active membership.
**Actual:** Banner visible incorrectly for the reporting member.

## 📸 Evidence

TBD from debug instrumentation.

## 🔭 Tracing Evidence

TBD

## 📊 PostHog Evidence

N/A

## 🧠 Root Cause Analysis

Under investigation.

## 🔧 Fix Applied

TBD

## 🧪 Unit / Regression Test

TBD

## 📝 Lessons Learned

TBD

## 🔗 References

- Related: BUG-097, BUG-068
