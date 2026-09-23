import type { StructuredPlan } from "../handoff/plan.ts";

export interface ReviewInput {
  runId: string;
  plan: StructuredPlan;
  executorSummary: string;
  verificationResults: string;
  diffSummary: string;
}

export interface ReviewVerdict {
  verdict: "approve" | "needs_changes" | "reject";
  summary: string;
  raw: string;
}
