import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createApproval } from "../approved-mode/mode-approval.ts";
import { inheritTrust } from "../approved-mode/trust.ts";
import {
    createModel,
    DEFAULT_EXECUTOR_MODEL,
    DEFAULT_EXPLORER_MODEL,
} from "../model.ts";
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
};

function buildExplorer(sandbox: Sandbox, parentTools: ParentTools) {
    return new ToolLoopAgent({
        model: createModel(process.env.EXPLORER_MODEL ?? DEFAULT_EXPLORER_MODEL),
        instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}`,
        tools: { read: parentTools.read, grep: parentTools.grep },
        stopWhen: stepCountIs(5),
    });
}

function buildExecutor(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
) {
    const depth = (spawn.depth ?? 0) + 1;
    const trust = inheritTrust(spawn.trust, depth);

    return new ToolLoopAgent({
        model: createModel(process.env.EXECUTOR_MODEL ?? DEFAULT_EXECUTOR_MODEL),
        instructions: `You are an executor agent. Follow instructions precisely.
Working directory: ${sandbox.workingDirectory}
Do NOT ask questions. Do NOT explore beyond what's needed. Execute the task.`,
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

export function createTaskTool(
    sandbox: Sandbox,
    parentTools: ParentTools,
    spawn: Spawn,
) {
    // Lesson 6.2: Explorer / 6.3 Executor
    return tool({
        description: `Delegate work to a subagent.
Explorer (default): read-only research with a fast model.
Executor: implementation with a stronger model and delegated trust on bash.

WHEN TO USE: the user asked to delegate; research across many files (explorer);
  bulk implementation (executor).
WHEN NOT TO USE: ambiguous requirements (use askUser),
  architectural decisions (the parent decides).`,
        inputSchema: z.object({
            description: z.string().describe("Task instructions for the subagent"),
            subagentType: z
                .enum(["explorer", "executor"])
                .default("explorer")
                .describe("Subagent role"),
        }),
        execute: async ({ description, subagentType }) => {
            console.error(`[tool] task execute subagentType=${subagentType}`);
            const parentRole = spawn.parentRole ?? "orchestrator";
            if (!canSpawn(parentRole, subagentType)) {
                return `Blocked: ${parentRole} cannot spawn ${subagentType}`;
            }
            const agent =
                subagentType === "executor"
                    ? buildExecutor(sandbox, parentTools, spawn)
                    : buildExplorer(sandbox, parentTools);
            return runSubagent(agent, description, subagentType);
        },
    });
}
