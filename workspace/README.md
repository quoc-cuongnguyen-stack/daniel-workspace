# 🐛 daniel_workspace — Persistent Error Log & Bug Memory

A structured system for tracking errors, documenting bug cases, and maintaining debugging knowledge across sessions. Integrated with **OpenTelemetry/Jaeger tracing** and **PostHog analytics**.

---

## 📁 Folder Structure

```
daniel_workspace/
├── README.md                                # This file — instructions
├── debug_log.md                             # Running error/debug journal
├── bug_cases/                               # Detailed bug case documentation
│   ├── _TEMPLATE.md                         # Template (with Tracing & PostHog sections)
│   └── BUG-XXX_slug.md                      # Individual bug case files
├── local_tracing/                           # OpenTelemetry local tracing setup
│   ├── instrumentation.mjs                  # OTel auto-instrumentation for ssl-be
│   ├── package.json                         # OTel dependencies
│   └── scripts/                             # Helper scripts
│       ├── check_jaeger.sh                  # Check & auto-start Jaeger container
│       └── query_traces.sh                  # Quick Jaeger API query shortcuts
├── docs/                                    # Documentation
│   ├── tracing_guide.md                     # Jaeger setup guide (Vietnamese)
│   └── debug_workflow_guide.md              # Full debug workflow documentation
├── feature-requests/                        # Feature planning & backlog
├── .agents/                                 # Agent configuration
│   └── skills/
│       └── debug-workflow/
│           └── SKILL.md                     # 5-phase debug workflow skill
```

---

## 🔧 How to Use

### 1. Debug Workflow (5-Phase)

When debugging any issue, follow the structured workflow:

| Phase | Name | Key Actions |
|-------|------|-------------|
| 1 | **REPRODUCE** | Confirm bug, check PostHog errors/sessions, log to debug_log.md |
| 2 | **TRACE** | Query Jaeger (backend) and/or PostHog (frontend) for observability data |
| 3 | **ANALYZE** | Use codebase graph tools to trace code path, cross-reference with traces |
| 4 | **FIX & VERIFY** | Apply fix, run linter, verify via Jaeger & PostHog |
| 5 | **DOCUMENT** | Create bug case, update debug log, create Knowledge Item |

Full documentation: [debug_workflow_guide.md](docs/debug_workflow_guide.md)

### 2. Debug Log (`debug_log.md`)

This is a **running journal** — append new entries at the top when you encounter an error.

**When to log:**
- Any error that takes more than 5 minutes to resolve
- Recurring issues
- Environment-specific bugs
- Production incidents

**Format:** Each entry follows the table format with Date, Project, Error, Status, and a link to a detailed bug case if applicable.

### 3. Bug Cases (`bug_cases/`)

For complex bugs that need deeper documentation, create a dedicated bug case file:

1. **Copy** `_TEMPLATE.md`
2. **Rename** to `BUG-XXX_short-description.md` (e.g., `BUG-002_cron-race-condition.md`)
3. **Fill in** all sections — including **🔭 Tracing Evidence** and **📊 PostHog Evidence**
4. **Link** from the debug log table

**Naming convention:** `BUG-{number}_{kebab-case-description}.md`

### 4. Helper Scripts

```bash
# Check & auto-start Jaeger container
bash daniel_workspace/local_tracing/scripts/check_jaeger.sh

# Query error traces (last 30 minutes)
bash daniel_workspace/local_tracing/scripts/query_traces.sh --errors --last 30

# Query slow traces (>2s)
bash daniel_workspace/local_tracing/scripts/query_traces.sh --slow 2000

# Quick health summary
bash daniel_workspace/local_tracing/scripts/query_traces.sh --summary

# Start backend with tracing
cd ssl-be
NODE_OPTIONS="--import ../daniel_workspace/local_tracing/instrumentation.mjs" pnpm start:dev
```

---

## 💡 Tips

- **Be specific** in error descriptions — include the actual error message
- **Always document root cause** — future-you will thank past-you
- **Link related files** — use `file:///absolute/path` links for quick navigation
- **Update status** — mark bugs as `✅ Fixed` when resolved
- **Cross-reference** — link bug cases to each other when related
- **Use tracing data** — always include Jaeger/PostHog evidence when available
- **Follow the workflow** — never skip Phase 2 (TRACE) or Phase 5 (DOCUMENT)
