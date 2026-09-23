import type { StructuredPlan } from "../handoff/plan.ts";
import {
  formatExecutorPlanPreview,
  formatRejection,
  isApprovalAnswer,
  resolvePlanApprovalMode,
} from "./plan-approval.ts";

export function runSelfTests(): void {
  if (resolvePlanApprovalMode({}) !== "interactive") {
    throw new Error("plan approval should default to interactive");
  }
  if (resolvePlanApprovalMode({ HARNESS_PLAN_APPROVAL: " Background " }) !== "background") {
    throw new Error("background mode should parse case-insensitively");
  }
  let threw = false;
  try {
    resolvePlanApprovalMode({ HARNESS_PLAN_APPROVAL: "0" });
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error("unknown plan approval mode should throw");
  }

  const plan: StructuredPlan = {
    goal: "Redact Authorization headers",
    files: ["lib/audit/audit-log.ts"],
    constraints: [],
    steps: ["Add a redaction pattern"],
    verification: ["pnpm typecheck"],
  };
  const preview = formatExecutorPlanPreview(plan);
  for (const section of [
    "=== Plan for executor ===",
    "=== Allowed write paths ===",
    "- lib/audit/audit-log.ts",
    "=== Verification commands (run without bash approval) ===",
    "- pnpm typecheck",
  ]) {
    if (!preview.includes(section)) {
      throw new Error(`preview missing: ${section}`);
    }
  }
  if (preview.includes("WARNING")) {
    throw new Error("preview should not warn when files are listed");
  }

  const empty = formatExecutorPlanPreview({ ...plan, files: [], verification: [] });
  if (!empty.includes("WARNING: executor cannot write any file")) {
    throw new Error("preview should warn when plan.files is empty");
  }

  if (!formatRejection("wrong file").includes("Reason: wrong file")) {
    throw new Error("rejection should carry the user's reason");
  }
  if (!formatRejection("  ").includes("Reason: (none given)")) {
    throw new Error("blank rejection reason should say none given");
  }

  if (!isApprovalAnswer("y") || !isApprovalAnswer(" YES ")) {
    throw new Error("y and yes should approve");
  }
  if (isApprovalAnswer("") || isApprovalAnswer("n") || isApprovalAnswer("yep")) {
    throw new Error("anything other than y/yes should reject");
  }
}

runSelfTests();
