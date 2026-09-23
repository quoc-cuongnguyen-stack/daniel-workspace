import { createInterface } from "node:readline/promises";
import { formatPlanForExecutor, type StructuredPlan } from "../handoff/plan.ts";

export type PlanApprovalMode = "interactive" | "background";

export type PlanApprovalDecision =
  | { approved: true }
  | { approved: false; reason: string };

const PLAN_APPROVAL_MODES: readonly PlanApprovalMode[] = ["interactive", "background"];

function isPlanApprovalMode(value: string): value is PlanApprovalMode {
  return (PLAN_APPROVAL_MODES as readonly string[]).includes(value);
}

export function resolvePlanApprovalMode(
  env: Record<string, string | undefined>,
): PlanApprovalMode {
  const raw = env.HARNESS_PLAN_APPROVAL?.trim().toLowerCase();
  if (!raw) {
    return "interactive";
  }
  if (!isPlanApprovalMode(raw)) {
    throw new Error(
      `Invalid HARNESS_PLAN_APPROVAL="${raw}". Use one of: ${PLAN_APPROVAL_MODES.join(", ")}.`,
    );
  }
  return raw;
}

export function formatExecutorPlanPreview(plan: StructuredPlan): string {
  const paths = plan.files.length
    ? plan.files.map((file) => `- ${file}`).join("\n")
    : "(none listed) -> WARNING: executor cannot write any file with this plan.";
  const verification = plan.verification.length
    ? plan.verification.map((command) => `- ${command}`).join("\n")
    : "(none listed)";

  return [
    "=== Plan for executor ===",
    formatPlanForExecutor(plan),
    "",
    "=== Allowed write paths ===",
    paths,
    "",
    "=== Verification commands (run without bash approval) ===",
    verification,
  ].join("\n");
}

export function formatRejection(reason: string): string {
  const given = reason.trim() || "(none given)";
  return [
    `Plan rejected by user. Reason: ${given}`,
    "Revise the plan and call task(executor) again. Do not run the executor with the rejected plan.",
  ].join("\n");
}

export function isApprovalAnswer(answer: string): boolean {
  return /^\s*y(es)?\s*$/i.test(answer);
}

export async function promptExecutorPlanApproval(
  preview: string,
): Promise<PlanApprovalDecision> {
  console.error(`\n${preview}\n`);
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question("Approve executor plan? [y/N] ");
    if (isApprovalAnswer(answer)) {
      return { approved: true };
    }
    const reason = await rl.question("Reason for rejection (optional): ");
    return { approved: false, reason };
  } finally {
    rl.close();
  }
}
