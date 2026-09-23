import { normalize } from "node:path";
import type { StepResult, StopCondition, ToolSet } from "ai";

const DESTRUCTIVE_GIT = /^\s*git\s+(checkout|restore|reset)\b/i;

export function normalizePlanPath(path: string): string {
  return normalize(path.trim().replace(/^\.\//, ""));
}

export function pathAllowedForWrite(
  filePath: string,
  allowedPaths: readonly string[],
): boolean {
  if (allowedPaths.length === 0) {
    return false;
  }
  const normalized = normalizePlanPath(filePath);
  return allowedPaths.some(
    (allowed) => normalizePlanPath(allowed) === normalized,
  );
}

export function isDestructiveGitCommand(command: string): boolean {
  return DESTRUCTIVE_GIT.test(command.trim());
}

export function destructiveGitBlockMessage(command: string): string {
  return (
    `Blocked: executors cannot run destructive git commands (${command.trim()}). ` +
    "Fix mistakes with write on plan files instead of reverting git state."
  );
}

export function isVerificationCommand(
  command: string,
  verificationCommands: readonly string[],
): boolean {
  const trimmed = command.trim();
  return verificationCommands.some((allowed) => allowed.trim() === trimmed);
}

export function executorStepHadProgress(
  step: Pick<StepResult<ToolSet>, "toolCalls">,
  verificationCommands: readonly string[],
): boolean {
  for (const call of step.toolCalls) {
    if (call.toolName === "write") {
      return true;
    }
    if (call.toolName === "bash") {
      const cmd = (call.input as { command?: string }).command ?? "";
      if (isVerificationCommand(cmd, verificationCommands)) {
        return true;
      }
    }
  }
  return false;
}

export function consecutiveIdleSteps(
  steps: ReadonlyArray<Pick<StepResult<ToolSet>, "toolCalls">>,
  verificationCommands: readonly string[],
): number {
  let idle = 0;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (executorStepHadProgress(steps[i]!, verificationCommands)) {
      break;
    }
    idle += 1;
  }
  return idle;
}

export function createIdleStopCondition(
  verificationCommands: readonly string[],
  idleLimit = 3,
): StopCondition<ToolSet> {
  return ({ steps }) =>
    consecutiveIdleSteps(steps, verificationCommands) >= idleLimit;
}
