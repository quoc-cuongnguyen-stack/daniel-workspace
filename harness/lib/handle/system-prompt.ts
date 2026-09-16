export interface PromptContext {
    workingDirectory: string;
    sandboxType: string;
    toolNames: string[];
    gitBranch?: string;
    projectContext?: string;
    verificationCommands?: string[];
}

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

    sections.push(`
# Agency
- USE your tools. Read files, search code, run commands, then answer.
- Do NOT explain what you WOULD do. Actually do it.${taskRouting}${surveyRouting}
- Prefer grep for searching, read for viewing files.
- Available tools: ${ctx.toolNames.join(", ")}
- Search before reading. Use grep first, then read only what you'll change.
- Don't read files "just in case." Read what you need when you need it.
`);

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


    sections.push(`
# Handling Ambiguity
When the task is ambiguous or has multiple valid approaches:
1. Search the code or docs to gather context first
2. Use askUser to let the user choose. Do NOT guess.
3. Examples: "add auth" -> ask OAuth or JWT; "set up a db" -> ask Postgres or SQLite
 
Specific tasks (with file paths, line numbers, or precise instructions) do not
need askUser. Act directly.`);


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
    if (ctx.projectContext) {
        sections.push(`
# Project Instructions (from AGENTS.md)
${ctx.projectContext}`);
    }

    return sections.join("\n");
}

{
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
}
