import { ToolLoopAgent, stepCountIs } from "ai";
import {
  modelSpecForRole,
  parseModelSpec,
  resolveModel,
} from "../model.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { createGrepTool } from "../tools/grep.ts";
import { createReadTool } from "../tools/read.ts";
import { logAuditEvent } from "../audit/audit-log.ts";
import { buildReviewerPrompt } from "../handle/system-prompt.ts";
import type { ReviewInput, ReviewVerdict } from "./reviewer.types.ts";

export type { ReviewInput, ReviewVerdict } from "./reviewer.types.ts";

export function parseVerdict(text: string): ReviewVerdict {
  const lower = text.toLowerCase();
  let verdict: ReviewVerdict["verdict"] = "needs_changes";
  if (lower.includes("verdict: approve") || lower.includes("verdict:approved")) {
    verdict = "approve";
  } else if (
    lower.includes("verdict: reject") ||
    lower.includes("verdict:rejected")
  ) {
    verdict = "reject";
  }

  const summaryMatch = text.match(/summary:\s*(.+)/i);
  const summary = summaryMatch?.[1]?.trim() ?? text.slice(0, 400);

  return { verdict, summary, raw: text };
}

export async function runReviewer(
  sandbox: Sandbox,
  input: ReviewInput,
): Promise<ReviewVerdict> {
  const specRaw = modelSpecForRole("reviewer");
  const { model, spec } = resolveModel(specRaw);
  const started = Date.now();

  const agent = new ToolLoopAgent({
    model,
    instructions: buildReviewerPrompt({
      workingDirectory: sandbox.workingDirectory,
      sandboxType: sandbox.type,
    }),
    tools: {
      read: createReadTool(sandbox),
      grep: createGrepTool(sandbox),
    },
    stopWhen: stepCountIs(8),
    onStepFinish: ({ usage, stepNumber }) => {
      logAuditEvent({
        runId: input.runId,
        timestamp: new Date().toISOString(),
        role: "reviewer",
        provider: spec.provider,
        model: spec.modelId,
        step: stepNumber,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    },
  });

  const prompt = [
    "# Plan",
    JSON.stringify(input.plan, null, 2),
    "",
    "# Executor result",
    input.executorSummary,
    "",
    "# Verification",
    input.verificationResults || "(none run)",
    "",
    "# Diff summary",
    input.diffSummary || "(no diff)",
    "",
    "Review the work against the plan. Respond with:",
    "Verdict: approve | needs_changes | reject",
    "Summary: one paragraph explaining your decision",
  ].join("\n");

  try {
    const { text, steps } = await agent.generate({ prompt });
    const body = text?.trim() ?? "(no reviewer response)";
    const verdict = parseVerdict(body);

    logAuditEvent({
      runId: input.runId,
      timestamp: new Date().toISOString(),
      role: "reviewer",
      provider: parseModelSpec(specRaw).provider,
      model: parseModelSpec(specRaw).modelId,
      durationMs: Date.now() - started,
      decision: verdict.summary,
      message: `review complete in ${steps.length} steps`,
    });

    return verdict;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logAuditEvent({
      runId: input.runId,
      timestamp: new Date().toISOString(),
      role: "reviewer",
      provider: parseModelSpec(specRaw).provider,
      model: parseModelSpec(specRaw).modelId,
      durationMs: Date.now() - started,
      message: `reviewer error: ${message}`,
    });
    return {
      verdict: "needs_changes",
      summary: `Reviewer failed: ${message}`,
      raw: message,
    };
  }
}
