import type { PromptContext } from "./prompt.types.ts";

export type { PromptContext } from "./prompt.types.ts";

export function buildSystemPrompt(ctx: PromptContext): string {
    const sections: string[] = [];

    const gates = ctx.verificationCommands?.length
        ? ctx.verificationCommands.map((c, i) => `${i + 1}. \`${c}\``).join("\n")
        : "(no verification commands discovered for this project)";

    sections.push(`You are a coding agent working in: ${ctx.workingDirectory}`);
    sections.push(`Sandbox: ${ctx.sandboxType}`);

    const taskRouting = ctx.toolNames.includes("task")
        ? `
- When the user says delegate, call task. Do not do that research or those edits with grep, read, or write yourself.`
        : "";

    const surveyRouting = ctx.toolNames.includes("survey")
        ? `
- For architectural questions ("how is X handled", "where does Y live"), call survey first, then read only the listed files.`
        : "";

    const skillRouting = ctx.toolNames.includes("loadSkill") && ctx.skills?.length
        ? `
- When the task names a skill or matches a listed skill, call loadSkill first, before read, grep, survey, or askUser. Do not search for SKILL.md or skills-lock.json.`
        : "";

    const searchRouting = ctx.skills?.length
        ? " If a listed skill applies, call loadSkill before searching."
        : "";

    if (ctx.agentRole === "orchestrator") {
        sections.push(`
# Orchestrator role
- You plan and delegate. You do NOT edit files or run shell commands yourself.
- Research with read, grep, and survey. Implementation goes to task(subagentType=executor).
- Produce a structured plan before delegating: goal, files, constraints, ordered steps, verification commands.
- Available tools: ${ctx.toolNames.join(", ")}${taskRouting}${surveyRouting}${skillRouting}
- Do not call write or bash. If implementation is needed, delegate to executor.`);
    } else if (ctx.agentRole === "executor") {
        const allowedFiles = ctx.allowedWritePaths?.length
            ? ctx.allowedWritePaths.map((f) => `- ${f}`).join("\n")
            : "(none listed)";
        sections.push(`
# Executor role
- Follow the delegated plan exactly. Do not expand scope or redesign architecture.
- Available tools: ${ctx.toolNames.join(", ")}
- Prefer grep before read. Change only the files required by the plan.
- You may write ONLY these plan files:
${allowedFiles}
- Do not run git checkout, git restore, or git reset. Fix mistakes with write on allowed files.
- Run listed verification commands and report pass/fail with evidence.`);
    } else if (ctx.agentRole === "reviewer") {
        sections.push(`
# Reviewer role
- Read-only review. Compare executor output and diff against the plan.
- Available tools: ${ctx.toolNames.join(", ")}
- Do not edit files or run commands.
- End with:
  Verdict: approve | needs_changes | reject
  Summary: one concise paragraph`);
    } else {
        sections.push(`
# Agency
- USE your tools. Read files, search code, run commands, then answer.
- Do NOT explain what you WOULD do. Actually do it.${taskRouting}${surveyRouting}${skillRouting}
- Prefer grep for searching, read for viewing files.
- Available tools: ${ctx.toolNames.join(", ")}
- Search before reading. Use grep first, then read only what you'll change.${searchRouting}
- Don't read files "just in case." Read what you need when you need it.
`);
    }

    if (ctx.toolNames.includes("survey")) {
        sections.push(`
# Fast context
- Named file path in the prompt -> read directly. Do not survey.
- Grep-able symbol or regex -> grep first. Do not survey.
- Architecture or "where does X live" -> survey first, then read listed files.
- Do not call task just to map files; use survey for file maps.`);
    }

    if (ctx.gitBranch) {
        sections.push(`- Current branch: ${ctx.gitBranch}`);
    }

    sections.push(`
# Guardrails
- Prefer simple, minimal changes
- Search before creating, and reuse existing patterns
- No new dependencies without asking`);

    if (ctx.skills?.length) {
        const lines = ctx.skills
            .map((s) => `- ${s.name}: ${s.description}`)
            .join("\n");
        sections.push(`
# Skills
The following skills are available. Call \`loadSkill\` with the name to get full content.
You MUST call loadSkill before read, grep, or askUser when a listed skill applies.
${lines}`);
    }

    if (ctx.agentRole !== "orchestrator" && ctx.agentRole !== "reviewer") {
        sections.push(`
# Verification
After making changes, verify your work by running these gates in order:
${gates}
 
Call bash for each listed gate immediately. Do not ask the user for
permission, and do not use askUser for verification.

Run each gate, capture the output, and report what passed and what didn't.
 
Distinguish failures you caused from failures that were already there:
- "Ran tsc: passed."
- "Ran npm test: 47 passed, 3 failed. The 3 failures are pre-existing in user.test.ts and unrelated to my changes."
 
Do NOT claim "tests pass" without running them. Do NOT inflate partial
verification into a blanket success claim.`);
    } else if (ctx.agentRole === "orchestrator") {
        sections.push(`
# Verification planning
Discovered project gates:
${gates}

Include relevant gates in the executor plan verification list.
Do not run verification commands yourself; delegate them to the executor.`);
    }


    sections.push(`
# Handling Ambiguity
When the task is ambiguous or has multiple valid approaches:
1. If a listed skill applies, call loadSkill first. Do not ask yet.
2. Search the code or docs to gather context
3. Use askUser to let the user choose. Do NOT guess.
4. Examples: "add auth" -> loadSkill if an auth skill is listed, otherwise ask OAuth or JWT; "set up a db" -> ask Postgres or SQLite
 
Specific tasks (named skills, file paths, line numbers, or precise instructions) do not
need askUser. Act directly.`);


    if (ctx.agentRole === "orchestrator") {
        sections.push(`
# Delegation
- Call task as soon as the request says to delegate.
- Explorer: task(subagentType=explorer) with a description.
- Executor: task(subagentType=executor) with a structured plan.
- Call executor only after explorer returns when the executor plan depends on that research.`);
    }

    if (ctx.toolNames.includes("todo")) {
        sections.push(`
# Task Planning

For multi-step tasks, you MUST use the todo tool before making changes.

Use todo when:
- the task has 3 or more distinct steps,
- the task modifies multiple files,
- or later steps depend on earlier steps.

Required workflow:
1. Add all planned tasks first.
2. Start exactly one task.
3. Complete it before starting the next.
4. Never have more than one task in_progress.

Do not use todo for simple questions, trivial single-file fixes, or exploratory reads.
`);
    }

    if (ctx.projectContext) {
        sections.push(`
# Project Instructions (from AGENTS.md)
${ctx.projectContext}`);
    }

    return sections.join("\n");
}

export function buildOrchestratorPrompt(ctx: PromptContext): string {
    return buildSystemPrompt({ ...ctx, agentRole: "orchestrator" });
}

export function buildExecutorPrompt(ctx: PromptContext): string {
    return buildSystemPrompt({ ...ctx, agentRole: "executor" });
}

export function buildReviewerPrompt(
    ctx: Pick<PromptContext, "workingDirectory" | "sandboxType">,
): string {
    return buildSystemPrompt({
        ...ctx,
        toolNames: ["read", "grep"],
        agentRole: "reviewer",
    });
}

export function buildExplorerPrompt(
    ctx: Pick<PromptContext, "workingDirectory" | "sandboxType">,
): string {
    return buildSystemPrompt({
        ...ctx,
        toolNames: ["read", "grep"],
        agentRole: "explorer",
    });
}
