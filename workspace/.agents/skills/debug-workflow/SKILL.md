---
name: debug-workflow
description: >
  Structured 5-phase debug workflow integrating OpenTelemetry/Jaeger tracing,
  PostHog session recordings & error tracking, and codebase-memory-mcp graph
  analysis. Activate when the user says "debug", "investigate", "tìm bug",
  "fix bug", "trace error", or reports unexpected behavior.
---

# Debug Workflow Skill

> **Trigger**: User reports a bug, error, performance issue, or unexpected behavior.
> **Goal**: Systematically reproduce → trace → analyze → fix → document.

---

## Phase 1: REPRODUCE — Confirm bug & collect evidence

### Steps

1. **Clarify symptom and inspect task context**:
   - If referenced from a Superthread task, fetch task details via Superthread MCP (`task_get` or `getTask`).
   - **Check for PostHog link in description**: Inspect the Superthread task description for any PostHog session recording, error tracking, or event link.
   - Ask user for any missing details: error message, screenshot, account context (email, userId, sessionId), timestamp, environment.

2. **Check PostHog Error Tracking** (if production/staging bug):
   ```
   posthog:exec → search error-tracking
   posthog:exec → info query-error-tracking-issues-list
   posthog:exec → call query-error-tracking-issues-list { filters matching the error }
   ```

3. **Check PostHog Session Recordings & Linked Task URLs** (MANDATORY if link present):
   - **If a PostHog URL is provided** (in prompt or Superthread task description):
     1. Extract `session_id`, `recording_id`, or `issue_id` from the URL path (e.g. `/replay/<session_id>` or `/error_tracking/<issue_id>`).
     2. Call `posthog:exec` using `query-session-recordings-list` or `query-error-tracking-issues-list` with the extracted ID filter.
     3. Extract and review browser console logs, JavaScript runtime errors, and network failure events recorded in that session before reading source code.
   ```
   posthog:exec → info query-session-recordings-list
   posthog:exec → call query-session-recordings-list { person email or event filters }
   ```

4. **Log the investigation start** - Update [debug_log.md](file:///Users/daniel/Projects/CyberSkill/SSL/daniel_workspace/debug_log.md):
   - Status: `🟡 Investigating`
   - Assign next BUG-XXX number

### Outputs
- Confirmed symptom description
- PostHog evidence (error events, session recording URLs)
- BUG-XXX entry in debug_log.md

---

## Phase 2: TRACE — Collect observability data

### Backend Bugs → Jaeger First

1. **Check Jaeger is running**:
   ```bash
   curl -sf http://localhost:16686/api/services > /dev/null && echo "✅ Jaeger OK" || echo "❌ Jaeger not running"
   ```
   If not running, execute:
   ```bash
   bash daniel_workspace/local_tracing/scripts/check_jaeger.sh
   ```

2. **[SPM First] Check Monitor Tab for high-level anomalies** — Open [http://localhost:16686/monitor](http://localhost:16686/monitor), select service `ssl-be-local`:
   - Which operations have an unusually high **Error Rate**?
   - Which operations show a spike in **P95 latency**?
   - Use this information to **target the right operation** before querying individual traces.

   Or query Prometheus directly:
   ```bash
   # Top 5 operations with highest error rate (last 1h)
   curl -s "http://localhost:9090/api/v1/query?query=topk(5,sum(rate(calls_total{service_name='ssl-be-local',status_code='STATUS_CODE_ERROR'}[1h]))by(operation))" | jq '.data.result[] | {op:.metric.operation, rate:.value[1]}'

   # P95 latency by operation
   curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(duration_milliseconds_bucket{service_name='ssl-be-local'}[5m]))by(le,operation))" | jq '.data.result[] | {op:.metric.operation, p95_ms:.value[1]}'
   ```

3. **Query error traces** (after identifying the target operation from SPM):
   ```bash
   curl -s "http://localhost:16686/api/traces?service=ssl-be-local&tags=%7B%22error%22%3A%22true%22%7D&limit=20&lookback=1h" | jq '.data[].spans[] | {operationName, duration, tags: [.tags[] | select(.key == "error" or .key == "http.status_code" or .key == "db.statement")]}'
   ```

4. **Query slow traces** (> 2s):
   ```bash
   curl -s "http://localhost:16686/api/traces?service=ssl-be-local&minDuration=2000000&limit=10&lookback=1h" | jq '.data[] | {traceID, spans: [.spans[] | {operationName, duration}]}'
   ```

### Frontend Bugs & Superthread PostHog Links → PostHog First

1. **Investigate Superthread PostHog Link (MANDATORY if present)**:
   - Check Superthread task description for PostHog links (session recording, error tracking issue, or event replay).
   - Use `posthog:exec` to query the linked session recording or error tracking issue directly. This step must not be skipped.

2. **Query user events timeline**:
   ```
   posthog:exec → call query-trends { event filters by user/session }
   ```

3. **Query error events**:
   ```
   posthog:exec → call read-data-schema { kind: "events" }
   posthog:exec → call query-error-tracking-issues-list { ... }
   ```

### Correlation (when both backend + frontend are involved)

- **Match by timestamp**: Align Jaeger trace timestamps with PostHog event timestamps
- **Match by userId**: Use the same userId across Jaeger span tags and PostHog person properties
- Build a **combined timeline** of what happened

### Outputs
- Jaeger trace IDs and span breakdowns (for backend)
- PostHog event timeline and session recording links (for frontend)
- Combined timeline (if both)

---

## Phase 3: ANALYZE — Root cause analysis

### Code Path Tracing (Graph-First)

1. **Identify the code path** from trace data:
   ```
   search_graph(name_pattern=".*HandlerOrServiceName.*")
   ```

2. **Trace call hierarchy**:
   ```
   trace_path(function_name="targetFunction", direction="inbound")
   trace_path(function_name="targetFunction", direction="outbound")
   ```

3. **Read the source code**:
   ```
   get_code_snippet(qualified_name="module/path.FunctionName")
   ```

4. **Cross-reference with trace spans**:
   - Match Jaeger span `operationName` → source function
   - Check span `duration` → identify bottleneck
   - Check span `tags.error` → identify failure point
   - Check span `tags.db.statement` → identify problematic DB queries

### Root Cause Determination

Document in the bug case file:
- **What** is failing (specific function/query/API)
- **Why** it fails (logic error, missing filter, race condition, etc.)
- **Impact** (who/what is affected, frequency)

### Outputs
- Identified root cause with code references
- Related source files linked

---

## Phase 4: FIX & VERIFY

### Apply Fix & Write Regression Test

1. Implement the code change
2. **Write a Unit / Regression Test** (MANDATORY):
   - Create or update a `.spec.ts` or `.test.ts` file using `vitest` that reproduces the bug scenario and verifies the fix.
   - Run the unit test to confirm clean pass:
     ```bash
     pnpm --prefix ssl-be test <test-file>
     ```
3. **Run linter** (MANDATORY):
   ```bash
   pnpm --prefix ssl-be lint && pnpm --prefix ssl-fe-user lint
   ```

### Verify via Tracing

1. Reproduce the scenario with tracing enabled:
   ```bash
   cd ssl-be
   NODE_OPTIONS="--import ../daniel_workspace/local_tracing/instrumentation.mjs" pnpm start:dev
   ```
2. Check Jaeger — the error spans should no longer appear
3. Check latency — verify no performance regression

### Verify via PostHog (if applicable)

1. Check error tracking — error should not recur
2. Check session recordings — user flow should complete successfully

### Outputs
- Fix applied, unit test added & passing, code linted
- Tracing verification (no error spans)
- PostHog verification (no recurring errors)

---

## Phase 5: DOCUMENT

### Required Documentation (ALL mandatory)

1. **Bug Case File** — Create `bug_cases/BUG-XXX_slug.md` from [_TEMPLATE.md](file:///Users/daniel/Projects/CyberSkill/SSL/daniel_workspace/bug_cases/_TEMPLATE.md):
   - Fill ALL sections including new **🔭 Tracing Evidence** and **📊 PostHog Evidence** sections
   - Link related source files with `file:///` paths

2. **Debug Log** — Update [debug_log.md](file:///Users/daniel/Projects/CyberSkill/SSL/daniel_workspace/debug_log.md):
   - Change status to `✅ Fixed`
   - Link to bug case file

3. **Knowledge Item** — Create KI under `<appDataDir>/knowledge/<bug-slug>/`:
   - `metadata.json` — title, summary, references, conversation ID
   - `artifacts/bug_analysis.md` — Symptom, Root Cause, Resolution

---

## Reference: Query Recipes

```text
# Find error events for a specific user
posthog:exec → call query-error-tracking-issues-list { dateRange, person filters }

# Find session recordings for a user
posthog:exec → call query-session-recordings-list { person.properties.$email = "user@example.com" }

# Check event frequency (is bug widespread?)
posthog:exec → call query-trends { event: error_event, interval: "day" }
```

### Jaeger Query Recipes

```bash
# All services registered
curl -s http://localhost:16686/api/services | jq

# Error traces in last hour
curl -s "http://localhost:16686/api/traces?service=ssl-be-local&tags=%7B%22error%22%3A%22true%22%7D&limit=20&lookback=1h"

# Slow traces (>2s)
curl -s "http://localhost:16686/api/traces?service=ssl-be-local&minDuration=2000000&limit=10"

# Traces for specific operation
curl -s "http://localhost:16686/api/traces?service=ssl-be-local&operation=GET%20/api/v1/users&limit=5"
```

### Prometheus SPM Query Recipes

```bash
# Total request rate by operation (QPS)
curl -s "http://localhost:9090/api/v1/query?query=sum(rate(calls_total{service_name='ssl-be-local'}[5m]))by(operation)" | jq '.data.result[] | {op:.metric.operation, rps:.value[1]}'

# Error rate by operation
curl -s "http://localhost:9090/api/v1/query?query=sum(rate(calls_total{service_name='ssl-be-local',status_code='STATUS_CODE_ERROR'}[5m]))by(operation)" | jq

# P95 latency (ms) by operation
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(duration_milliseconds_bucket{service_name='ssl-be-local'}[5m]))by(le,operation))" | jq '.data.result[] | {op:.metric.operation, p95_ms:.value[1]}'

# P50 latency (ms) — median
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.50,sum(rate(duration_milliseconds_bucket{service_name='ssl-be-local'}[5m]))by(le,operation))" | jq
```

> **SPM UI**: View visually at [http://localhost:16686/monitor](http://localhost:16686/monitor) — select service `ssl-be-local`.
> **Prometheus UI**: Explore and write custom PromQL at [http://localhost:9090](http://localhost:9090).
