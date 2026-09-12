export interface PromptContext {
    workingDirectory: string;
    sandboxType: string;
    toolNames: string[];
    gitBranch?: string;
    projectContext?: string;
    scripts?: Record<string, string>;
}

const VERIFY_SCRIPTS = ["typecheck", "lint", "test", "build"] as const;

export function buildSystemPrompt(ctx: PromptContext): string {
    const sections: string[] = [];

    sections.push(`You are a coding agent working in: ${ctx.workingDirectory}`);
    sections.push(`Sandbox: ${ctx.sandboxType}`);

    const taskRouting = ctx.toolNames.includes("task")
        ? `
- When the user says delegate, call task. Do not do that research or those edits with grep, read, or write yourself.`
        : "";

    sections.push(`
# Agency
- USE your tools. Read files, search code, run commands, then answer.
- Do NOT explain what you WOULD do. Actually do it.${taskRouting}
- Prefer grep for searching, read for viewing files.
- Use bash only for commands that aren't covered by other tools.
- Available tools: ${ctx.toolNames.join(", ")}`);

    if (ctx.gitBranch) {
    sections.push(`- Current branch: ${ctx.gitBranch}`);
    }

    sections.push(`
# Guardrails
- Prefer simple, minimal changes
- Search before creating, and reuse existing patterns
- No new dependencies without asking`);

    const verify = VERIFY_SCRIPTS.filter((name) => ctx.scripts?.[name]);
    const steps =
    verify.length === 0
        ? "This project has no typecheck, lint, test, or build scripts. Do not invent those checks."
        : verify
            .map(
            (name, i) =>
                `${i + 1}. Run \`pnpm ${name}\` (scripts.${name} is defined)`,
            )
            .join("\n");

    sections.push(`
# Verification
After making changes, verify your work:
1. Run \`npx tsc --noEmit\` when TypeScript is present
2. Run lint, test, or build commands only if they exist in this project and are allowed by the current approval mode
3. Report exactly what you ran, what was blocked, and what was unavailable
4. Do NOT inflate partial verification into a blanket success claim
${steps}

Do NOT claim "tests pass" without running them.
Scope your claims honestly. "Verification was limited because writes were blocked" is honest.
"All tests pass" when you didn't run them is not.`);

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

    const withTypecheck = buildSystemPrompt({
        ...base,
        scripts: { typecheck: "tsc --noEmit", start: "bun run index.ts" },
    });
    if (!withTypecheck.includes("scripts.typecheck")) {
        throw new Error("expected scripts.typecheck in Verification");
    }
    if (withTypecheck.includes("scripts.lint") || withTypecheck.includes("pnpm lint")) {
        throw new Error("lint must not appear when scripts.lint is missing");
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
}
