import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createApproval } from "../approved-mode/mode-approval.ts";
import { inheritTrust } from "../approved-mode/trust.ts";
import { createLocalModel } from "../model.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { createBashTool } from "./bash.ts";
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
  onExecutorFinish?: () => void;
};

async function buildExplorer(sandbox: Sandbox, parentTools: ParentTools) {
    return new ToolLoopAgent({
        model: await createLocalModel(process.env.LOCAL_EXPLORER_MODEL),
        instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}
Paths in this repo are under lib/, not src/. If a path is missing, grep for the file name.
After tools succeed, write a short final report.`,
        tools: { read: parentTools.read, grep: parentTools.grep },
        stopWhen: stepCountIs(5),
        maxRetries: 0,
    });
}

async function buildExecutor(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
) {
    const depth = (spawn.depth ?? 0) + 1;
    const trust = inheritTrust(spawn.trust, depth);
    console.error(`[task] executor depth=${depth} trust=${trust.length}`);

    return new ToolLoopAgent({
        model: await createLocalModel(process.env.LOCAL_EXECUTOR_MODEL),
        instructions: `You are an executor agent. Follow instructions precisely.
Working directory: ${sandbox.workingDirectory}
Paths in this repo are under lib/, not src/. If a path is missing, grep for the file name.
To rename a variable: read the file, write the full updated contents, then run \`npx tsc --noEmit\`.
Do NOT ask questions. Do NOT only re-read files. Apply the requested writes, then write a short final report.`,
        tools: {
            read: parentTools.read,
            grep: parentTools.grep,
            write: parentTools.write,
            bash: createBashTool(
                sandbox,
                createApproval({ mode: "delegated", trust }),
            ),
        },
        stopWhen: stepCountIs(15),
        maxRetries: 0,
        onStepFinish: ({ stepNumber, toolCalls }) => {
            console.error(
                `[task] executor step ${stepNumber}: ${toolCalls.map((c) => c.toolName).join(", ") || "text"}`,
            );
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
        const body = text?.trim();
        console.error(`[task] ${role} steps=${steps.length} textLength=${body?.length ?? 0}`);
        const label = role.charAt(0).toUpperCase() + role.slice(1);
        return body
            ? `[${label}: ${steps.length} steps]\n${body}`
            : `[${label}: ${steps.length} steps]\n(no final text — the model used the whole step budget on tool calls)`;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `${role} error: ${message}`;
    }
}

const SPAWN_PERMISSIONS: Record<string, string[]> = {
  orchestrator: ["explorer", "executor", "reviewer"],
  executor: ["explorer"],
  explorer: [],
};
 
function canSpawn(parentRole: string, subagentType: string): boolean {
  return SPAWN_PERMISSIONS[parentRole]?.includes(subagentType) ?? false;
}

export function createTaskTool(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
) {
    return tool({
        description: `Delegate work to a subagent.
Explorer (default): read-only research with a fast model.
Executor: implementation with write + delegated bash. Use this to rename symbols or change files.

WHEN TO USE: research across many files (explorer), bulk implementation (executor).
WHEN NOT TO USE: ambiguous requirements (use askUser),
  architectural decisions (the parent decides).
Call task once per role the user requested (explorer, then executor if asked).
The parent must not edit files itself after delegating.`,
        inputSchema: z.object({
            description: z.string().describe("Task instructions for the subagent"),
            subagentType: z
                .enum(["explorer", "executor"])
                .default("explorer")
                .describe("Subagent role"),
        }),
        execute: async ({ description, subagentType }) => {
            const parentRole = spawn.parentRole ?? "orchestrator";
            if (!canSpawn(parentRole, subagentType)) {
                return `Blocked: ${parentRole} cannot spawn ${subagentType}`;
            }
            const agent =
                subagentType === "executor"
                    ? await buildExecutor(sandbox, parentTools, spawn)
                    : await buildExplorer(sandbox, parentTools);
            const result = await runSubagent(agent, description, subagentType);
            if (subagentType === "executor") {
                spawn.onExecutorFinish?.();
            }
            return result;
        },
    });
}
