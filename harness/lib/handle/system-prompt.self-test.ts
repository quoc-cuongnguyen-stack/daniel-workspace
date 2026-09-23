import type { PromptContext } from "./prompt.types.ts";
import {
  buildExecutorPrompt,
  buildExplorerPrompt,
  buildOrchestratorPrompt,
  buildReviewerPrompt,
  buildSystemPrompt,
} from "./system-prompt.ts";

export function runSelfTests(): void {
  const base: PromptContext = {
    workingDirectory: ".",
    sandboxType: "local",
    toolNames: ["read", "grep", "bash"],
  };
  const withBranch = buildSystemPrompt({ ...base, gitBranch: "main" });
  if (!withBranch.includes("Current branch: main")) {
    throw new Error('expected "Current branch: main"');
  }
  const withoutBranch = buildSystemPrompt(base);
  if (withoutBranch.includes("Current branch:")) {
    throw new Error("gitBranch line should be absent");
  }

  const withGates = buildSystemPrompt({
    ...base,
    verificationCommands: ["npm run typecheck"],
  });
  if (!withGates.includes("`npm run typecheck`")) {
    throw new Error("expected discovered typecheck gate in Verification");
  }
  if (withGates.includes("npm run lint") || withGates.includes("pnpm lint")) {
    throw new Error("lint must not appear when it was not discovered");
  }
  if (!withGates.includes("Distinguish failures you caused from failures that were already there")) {
    throw new Error("expected scoped-claims rule in Verification");
  }
  if (!withGates.includes("Call bash for each listed gate immediately")) {
    throw new Error("expected bash-now rule in Verification");
  }

  const withoutGates = buildSystemPrompt(base);
  if (!withoutGates.includes("(no verification commands discovered for this project)")) {
    throw new Error("expected empty-gates fallback in Verification");
  }

  const withTask = buildSystemPrompt({
    ...base,
    toolNames: ["read", "grep", "task"],
  });
  if (!withTask.includes("When the user says delegate, call task.")) {
    throw new Error("expected task routing when task is available");
  }
  const withoutTask = buildSystemPrompt(base);
  if (withoutTask.includes("When the user says delegate, call task.")) {
    throw new Error("task routing should be absent without the task tool");
  }

  const withSurvey = buildSystemPrompt({
    ...base,
    toolNames: ["read", "grep", "survey"],
  });
  if (!withSurvey.includes("call survey first")) {
    throw new Error("expected survey routing when survey is available");
  }
  if (!withSurvey.includes("# Fast context")) {
    throw new Error("expected Fast context section when survey is available");
  }
  const withoutSurvey = buildSystemPrompt(base);
  if (withoutSurvey.includes("call survey first")) {
    throw new Error("survey routing should be absent without the survey tool");
  }
  if (withoutSurvey.includes("# Fast context")) {
    throw new Error("Fast context should be absent without the survey tool");
  }

  const withSkills = buildSystemPrompt({
    ...base,
    toolNames: ["read", "loadSkill"],
    skills: [{ name: "auth-patterns", description: "auth conventions" }],
  });
  if (!withSkills.includes("# Skills")) {
    throw new Error("expected Skills section when skills are listed");
  }
  if (!withSkills.includes("- auth-patterns: auth conventions")) {
    throw new Error("expected skill name and description in the Skills section");
  }
  if (!withSkills.includes("call loadSkill first")) {
    throw new Error("expected loadSkill routing when skills are listed");
  }
  if (!withSkills.includes("MUST call loadSkill")) {
    throw new Error("expected mandatory loadSkill instruction in Skills section");
  }
  if (withSkills.indexOf("# Skills") > withSkills.indexOf("# Handling Ambiguity")) {
    throw new Error("Skills section should appear before Handling Ambiguity");
  }
  if (!withSkills.includes("If a listed skill applies, call loadSkill first")) {
    throw new Error("expected Handling Ambiguity to defer to loadSkill");
  }
  const withoutSkills = buildSystemPrompt({
    ...base,
    toolNames: ["read", "loadSkill"],
  });
  if (withoutSkills.includes("# Skills")) {
    throw new Error("Skills section should be absent without skills");
  }
  if (withoutSkills.includes("When the task names a skill or matches a listed skill")) {
    throw new Error("loadSkill routing should be absent without skills");
  }

  const orchestrator = buildOrchestratorPrompt({
    ...base,
    toolNames: ["read", "grep", "task", "todo"],
  });
  if (!orchestrator.includes("# Orchestrator role")) {
    throw new Error("expected orchestrator role section");
  }
  if (!orchestrator.includes("MUST use the todo tool")) {
    throw new Error("orchestrator should be told to manage a todo list");
  }
  if (!orchestrator.includes("Call task as soon as the request says to delegate")) {
    throw new Error("orchestrator should be told to delegate immediately");
  }
  if (orchestrator.includes("Call bash for each listed gate immediately")) {
    throw new Error("orchestrator should not instruct bash verification");
  }
  if (orchestrator.includes("# Plan approval")) {
    throw new Error("Plan approval section should be absent without interactive mode");
  }
  const gatedOrchestrator = buildOrchestratorPrompt({
    ...base,
    toolNames: ["read", "grep", "task", "todo"],
    planApprovalMode: "interactive",
  });
  if (!gatedOrchestrator.includes("Never run the executor with a rejected plan")) {
    throw new Error("interactive plan approval should tell the orchestrator how to handle rejection");
  }

  const executor = buildExecutorPrompt({
    ...base,
    toolNames: ["read", "grep", "write", "bash"],
    allowedWritePaths: ["harness/lib/audit/audit-log.ts"],
  });
  if (!executor.includes("# Executor role")) {
    throw new Error("expected executor role section");
  }
  if (!executor.includes("harness/lib/audit/audit-log.ts")) {
    throw new Error("executor should list allowed write paths");
  }
  if (!executor.includes("Do not run git checkout, git restore, or git reset")) {
    throw new Error("executor should forbid destructive git commands");
  }

  const reviewer = buildReviewerPrompt(base);
  if (!reviewer.includes("Verdict: approve")) {
    throw new Error("expected reviewer verdict contract");
  }

  // buildExplorerPrompt is exported; smoke-check it composes without throwing.
  buildExplorerPrompt(base);
}

runSelfTests();
