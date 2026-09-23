import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import {
    logAuditEvent,
    summarizeToolInput,
} from "../audit/audit-log.ts";
import { createApproval } from "../approved-mode/mode-approval.ts";
import {
    formatExecutorPlanPreview,
    formatRejection,
    promptExecutorPlanApproval,
    type PlanApprovalMode,
} from "../approved-mode/plan-approval.ts";
import { inheritTrust } from "../approved-mode/trust.ts";
import {
    formatPlanForExecutor,
    structuredPlanSchema,
    tryParseStructuredPlan,
    type StructuredPlan,
} from "../handoff/plan.ts";
import { buildExecutorPrompt } from "../handle/system-prompt.ts";
import { traceToolActivity } from "../handle/tool-trace.ts";
import {
    modelSpecForRole,
    parseModelSpec,
    resolveModel,
} from "../model.ts";
import { runReviewer } from "../review/reviewer.ts";
import type { Sandbox, WritableSandbox } from "../sandbox/sandbox.ts";
import { createBashTool } from "./bash.ts";
import {
    createIdleStopCondition,
    destructiveGitBlockMessage,
    isDestructiveGitCommand,
} from "./executor-loop.ts";
import { createGrepTool } from "./grep.ts";
import { createReadTool } from "./read.ts";
import { createWriteTool } from "./write.ts";

type ParentTools = {
    read: ReturnType<typeof createReadTool>;
    grep: ReturnType<typeof createGrepTool>;
    write: ReturnType<typeof createWriteTool>;
};

type Spawn = {
    trust: readonly string[];
    depth?: number;
    parentRole?: string;
    runId: string;
    verificationCommands?: string[];
    planApprovalMode?: PlanApprovalMode;
};

async function runVerification(
    sandbox: Sandbox,
    commands: string[],
): Promise<{ summary: string; allPassed: boolean }> {
    if (commands.length === 0) {
        return { summary: "(no verification commands)", allPassed: true };
    }

    const lines: string[] = [];
    let allPassed = true;
    for (const command of commands) {
        const { stdout, exitCode } = await sandbox.exec(command);
        const status = exitCode === 0 ? "passed" : "failed";
        if (exitCode !== 0) {
            allPassed = false;
        }
        lines.push(`${command}: ${status}`);
        if (stdout.trim()) {
            lines.push(stdout.trim().slice(0, 500));
        }
    }
    return { summary: lines.join("\n"), allPassed };
}

async function collectDiffSummary(sandbox: Sandbox): Promise<string> {
    const { stdout, exitCode } = await sandbox.exec("git diff --stat");
    if (exitCode !== 0 && !stdout.trim()) {
        return "(git diff unavailable)";
    }
    return stdout.trim() || "(no changes)";
}

function buildExplorer(sandbox: Sandbox, parentTools: ParentTools, runId: string) {
    const specRaw = modelSpecForRole("explorer");
    const { model, spec } = resolveModel(specRaw);

    return new ToolLoopAgent({
        model,
        instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}`,
        tools: { read: parentTools.read, grep: parentTools.grep },
        stopWhen: stepCountIs(5),
        onStepFinish: ({ usage, stepNumber }) => {
            logAuditEvent({
                runId,
                timestamp: new Date().toISOString(),
                role: "explorer",
                provider: spec.provider,
                model: spec.modelId,
                step: stepNumber,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
            });
        },
    });
}

function buildExecutor(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
    verificationCommands: string[],
    allowedWritePaths: string[],
) {
    const depth = (spawn.depth ?? 0) + 1;
    const trust = inheritTrust(spawn.trust, depth);
    const specRaw = modelSpecForRole("executor");
    const { model, spec } = resolveModel(specRaw);

    return new ToolLoopAgent({
        model,
        instructions: buildExecutorPrompt({
            workingDirectory: sandbox.workingDirectory,
            sandboxType: sandbox.type,
            toolNames: ["read", "grep", "write", "bash"],
            verificationCommands,
            allowedWritePaths,
        }),
        tools: {
            read: parentTools.read,
            grep: parentTools.grep,
            write: createWriteTool(sandbox as WritableSandbox, {
                allowedPaths: allowedWritePaths,
            }),
            bash: createBashTool(
                sandbox,
                createApproval({ mode: "delegated", trust }),
                undefined,
                {
                    blockCommand: (command) =>
                        isDestructiveGitCommand(command)
                            ? destructiveGitBlockMessage(command)
                            : null,
                },
            ),
        },
        stopWhen: [
            stepCountIs(15),
            createIdleStopCondition(verificationCommands, 3),
        ],
        onStepFinish: ({ usage, stepNumber }) => {
            logAuditEvent({
                runId: spawn.runId,
                timestamp: new Date().toISOString(),
                role: "executor",
                provider: spec.provider,
                model: spec.modelId,
                step: stepNumber,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
            });
        },
    });
}

async function runSubagent(
    agent: {
        generate: (input: { prompt: string }) => Promise<{
            text?: string;
            steps: ReadonlyArray<unknown>;
        }>;
    },
    description: string,
    role: string,
) {
    try {
        const { text, steps } = await agent.generate({ prompt: description });
        return text
            ? `[${role}: ${steps.length} steps]\n${text}`
            : `(no response from ${role})`;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `${role} error: ${message}`;
    }
}

const SPAWN_PERMISSIONS: Record<string, string[]> = {
    orchestrator: ["explorer", "executor"],
    executor: ["explorer"],
    explorer: [],
};

function canSpawn(parentRole: string, subagentType: string): boolean {
    return SPAWN_PERMISSIONS[parentRole]?.includes(subagentType) ?? false;
}

async function runExecutorWithReview(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
    plan: z.infer<typeof structuredPlanSchema>,
): Promise<string> {
    const started = Date.now();
    const verificationCommands =
        plan.verification.length > 0
            ? plan.verification
            : (spawn.verificationCommands ?? []);

    const executor = buildExecutor(
        sandbox,
        parentTools,
        spawn,
        verificationCommands,
        plan.files,
    );
    const executorPrompt = formatPlanForExecutor(plan);
    const executorSummary = await runSubagent(executor, executorPrompt, "executor");

    const verification = await runVerification(sandbox, verificationCommands);
    const diffSummary = await collectDiffSummary(sandbox);

    logAuditEvent({
        runId: spawn.runId,
        timestamp: new Date().toISOString(),
        role: "executor",
        provider: parseModelSpec(modelSpecForRole("executor")).provider,
        model: parseModelSpec(modelSpecForRole("executor")).modelId,
        durationMs: Date.now() - started,
        verificationStatus: verification.allPassed ? "passed" : "failed",
        message: "executor pipeline complete",
    });

    const verdict = await runReviewer(sandbox, {
        runId: spawn.runId,
        plan,
        executorSummary,
        verificationResults: verification.summary,
        diffSummary,
    });

    return [
        `[approved plan]\n${formatPlanForExecutor(plan)}`,
        "",
        executorSummary,
        "",
        `[verification]\n${verification.summary}`,
        "",
        `[diff]\n${diffSummary}`,
        "",
        `[review: ${verdict.verdict}]\n${verdict.summary}`,
    ].join("\n");
}

// Returns a message for the orchestrator when the executor must not run.
async function gateExecutorPlan(
    spawn: Spawn,
    plan: StructuredPlan,
): Promise<string | null> {
    const mode = spawn.planApprovalMode ?? "background";
    switch (mode) {
        case "background":
            return null;
        case "interactive":
            break;
        default: {
            const _exhaustive: never = mode;
            return _exhaustive;
        }
    }

    if (!process.stdin.isTTY || !process.stderr.isTTY) {
        logPlanDecision(spawn, "rejected", "no TTY");
        return "Plan approval requires an interactive terminal. Set HARNESS_PLAN_APPROVAL=background to run without approval.";
    }

    const decision = await promptExecutorPlanApproval(formatExecutorPlanPreview(plan));
    if (decision.approved) {
        logPlanDecision(spawn, "approved");
        return null;
    }
    logPlanDecision(spawn, "rejected", decision.reason);
    return formatRejection(decision.reason);
}

function logPlanDecision(
    spawn: Spawn,
    decision: "approved" | "rejected",
    reason?: string,
): void {
    const spec = parseModelSpec(modelSpecForRole("orchestrator"));
    logAuditEvent({
        runId: spawn.runId,
        timestamp: new Date().toISOString(),
        role: "orchestrator",
        provider: spec.provider,
        model: spec.modelId,
        tool: "task",
        inputSummary: "executor plan approval",
        decision,
        message: reason?.trim() || undefined,
    });
}

export function createTaskTool(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
) {
    return tool({
        description: `Delegate work to a subagent.
Explorer (default): read-only research with a fast local or cloud model.
Executor: implementation from a structured plan.

WHEN TO USE: the user asked to delegate; research across many files (explorer);
  bulk implementation (executor).
WHEN NOT TO USE: ambiguous requirements (use askUser),
  architectural decisions (the parent decides).`,
        inputSchema: z.object({
            description: z
                .string()
                .optional()
                .describe("Free-form task instructions (explorer or fallback executor prompt)"),
            plan: structuredPlanSchema
                .optional()
                .describe("Structured plan required for executor subagent"),
            subagentType: z
                .enum(["explorer", "executor"])
                .default("explorer")
                .describe("Subagent role"),
        }),
        execute: async ({ description, plan, subagentType }) => {
            traceToolActivity(`[tool] task execute subagentType=${subagentType}`);
            logAuditEvent({
                runId: spawn.runId,
                timestamp: new Date().toISOString(),
                role: "orchestrator",
                provider: parseModelSpec(modelSpecForRole("orchestrator")).provider,
                model: parseModelSpec(modelSpecForRole("orchestrator")).modelId,
                tool: "task",
                inputSummary: summarizeToolInput("task", {
                    subagentType,
                    description,
                    plan,
                }),
            });

            const parentRole = spawn.parentRole ?? "orchestrator";
            if (!canSpawn(parentRole, subagentType)) {
                return `Blocked: ${parentRole} cannot spawn ${subagentType}`;
            }

            if (subagentType === "executor") {
                const parsed = plan
                    ? tryParseStructuredPlan(plan)
                    : { ok: false as const, error: "missing plan" };

                if (!parsed.ok) {
                    return `Executor requires a valid structured plan. ${parsed.error}`;
                }

                const blocked = await gateExecutorPlan(spawn, parsed.plan);
                if (blocked) {
                    return blocked;
                }

                return runExecutorWithReview(
                    sandbox,
                    parentTools,
                    spawn,
                    parsed.plan,
                );
            }

            const prompt = description?.trim();
            if (!prompt) {
                return "Explorer requires a description.";
            }

            const agent = buildExplorer(sandbox, parentTools, spawn.runId);
            return runSubagent(agent, prompt, subagentType);
        },
    });
}
