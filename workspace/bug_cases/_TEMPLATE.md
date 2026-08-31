# BUG-XXX: [Title]

> **Status:** 🔴 Open | 🟡 Investigating | 🔵 In Progress | ✅ Fixed | ⚠️ Workaround
> **Date Found:** YYYY-MM-DD
> **Date Fixed:** YYYY-MM-DD
> **Project:** [Project Name]
> **Severity:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔍 Description

Brief description of the bug and its impact.

## 🔄 Reproduction Steps

1. Step one
2. Step two
3. Step three

**Expected behavior:** What should happen
**Actual behavior:** What actually happens

## 📸 Evidence

<!-- Paste error messages, screenshots, or logs here -->

```
Error message or stack trace
```

## 🔭 Tracing Evidence

> Jaeger trace data collected during investigation.
> Leave blank if not applicable (e.g., pure frontend bug with no backend component).

**Jaeger Trace IDs:**
- `traceId`: [link to Jaeger UI](http://localhost:16686/trace/{traceId})

**Span Breakdown:**
| Span | Operation | Duration | Error? |
|------|-----------|----------|--------|
| Root | `GET /api/v1/...` | 1200ms | ❌ |
| DB   | `mongodb.find` | 800ms | ❌ |
| ...  | ... | ... | ... |

**Key Observations:**
- What did the traces reveal? (e.g., slow DB query, missing index, error in specific span)

## 📊 PostHog Evidence

> PostHog session recordings, error tracking, and event data.
> Leave blank if not applicable (e.g., pure backend/cron bug).

**Session Recording:** [link](https://eu.posthog.com/project/108852/replay/...)
**Error Tracking Issue:** [link](https://eu.posthog.com/project/108852/error_tracking/...)

**User Journey (from PostHog events):**
1. User navigated to `/page`
2. User clicked "action"
3. Error occurred → redirected to error page

**Event Data:**
- Error event: `$exception` / custom error event
- Frequency: How often does this occur?
- Affected users: How many users impacted?

## 🧠 Root Cause Analysis

Explain **why** the bug occurred. Be specific about the code path, data flow, or configuration that caused the issue.

**Related files:**
- [filename](file:///absolute/path/to/file)

## 🔧 Fix Applied

Describe the fix. Include code snippets or diff if helpful.

```diff
- old code
+ new code
```

## 🧪 Unit / Regression Test

- **Test File:** [test_name.spec.ts](file:///absolute/path/to/test.spec.ts)
- **Command:** `pnpm --prefix ssl-be test <path-to-test>`
- **Test Results:** Describe what cases were asserted (e.g. verified soft-deleted record is excluded, chunk error triggers reload).

## 📝 Lessons Learned

- What could have prevented this bug?
- What patterns should we watch out for?
- Any follow-up tasks or improvements?

## 🔗 References

- Related bug cases: BUG-XXX
- External links: [description](url)
- Knowledge items: [title](path)
- Jaeger traces: [traceId](http://localhost:16686/trace/{traceId})
- PostHog recordings: [session](https://eu.posthog.com/project/108852/replay/...)
