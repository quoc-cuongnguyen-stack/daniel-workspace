import type { StepResult, ToolSet } from "ai";
import {
  consecutiveIdleSteps,
  createIdleStopCondition,
  isDestructiveGitCommand,
  pathAllowedForWrite,
} from "./executor-loop.ts";

export function runSelfTests(): void {
  if (!pathAllowedForWrite("harness/lib/audit/audit-log.ts", ["harness/lib/audit/audit-log.ts"])) {
    throw new Error("allowed plan path should permit write");
  }
  if (pathAllowedForWrite("harness/lib/cache.ts", ["harness/lib/audit/audit-log.ts"])) {
    throw new Error("out-of-plan path should be blocked");
  }
  if (!isDestructiveGitCommand("git checkout -- harness/lib/cache.ts")) {
    throw new Error("git checkout should be blocked for executors");
  }
  if (isDestructiveGitCommand("git status")) {
    throw new Error("git status should not be treated as destructive");
  }

  const steps = [
    { toolCalls: [{ toolName: "read", input: {} }] },
    { toolCalls: [{ toolName: "grep", input: {} }] },
    { toolCalls: [{ toolName: "read", input: {} }] },
  ] as Pick<StepResult<ToolSet>, "toolCalls">[];

  if (consecutiveIdleSteps(steps, ["pnpm typecheck"]) !== 3) {
    throw new Error("three read/grep-only steps should count as idle");
  }

  const withWrite = [
    ...steps.slice(0, 2),
    { toolCalls: [{ toolName: "write", input: { path: "a.ts" } }] },
    { toolCalls: [{ toolName: "read", input: {} }] },
  ] as Pick<StepResult<ToolSet>, "toolCalls">[];

  if (consecutiveIdleSteps(withWrite, ["pnpm typecheck"]) !== 1) {
    throw new Error("recent write should reset idle tail count");
  }

  const stop = createIdleStopCondition(["pnpm typecheck"], 3);
  if (!stop({ steps: steps as StepResult<ToolSet>[] })) {
    throw new Error("idle stop should trigger after three idle steps");
  }
  if (stop({ steps: withWrite as StepResult<ToolSet>[] })) {
    throw new Error("idle stop should not trigger when a recent write happened");
  }
}

runSelfTests();
