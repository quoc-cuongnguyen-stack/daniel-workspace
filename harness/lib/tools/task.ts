import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { createApproval } from "../approved-mode/mode-approval.ts";
import { createLocalModel } from "../model.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { createBashTool } from "./bash.ts";
import { createGrepTool } from "./grep.ts";
import { createReadTool } from "./read.ts";
import { createWriteTool } from "./write.ts";

export function createTaskTool(
    sandbox: Sandbox,
    parentTools: {
        read: ReturnType<typeof createReadTool>;
        grep: ReturnType<typeof createGrepTool>;
        write: ReturnType<typeof createWriteTool>;
    },
) {
    return tool({
        description: `Delegate work to a subagent.
Explorer (default): read-only research with a fast model.
Executor: implementation with write + delegated bash. Use this to rename symbols or change files.

WHEN TO USE: research across many files (explorer), bulk implementation (executor).
WHEN NOT TO USE: ambiguous requirements (use askUser),
  architectural decisions (the parent decides).
After this tool returns, relay the result to the user. Do not call task again for the same request.`,
        inputSchema: z.object({
            description: z.string().describe("Task instructions for the subagent"),
            subagentType: z
                .enum(["explorer", "executor"])
                .default("explorer")
                .describe("Subagent role"),
        }),
        execute: async ({ description, subagentType }) => {
            console.error(`[task] start type=${subagentType}`);

            if (subagentType === "executor") {
                const executorBash = createBashTool(
                    sandbox,
                    createApproval({
                        mode: "delegated",
                        trust: ["npm test", "npm run build", "npx tsc"],
                    }),
                );

                const executor = new ToolLoopAgent({
                    model: await createLocalModel(process.env.LOCAL_EXECUTOR_MODEL),
                    instructions: `You are an executor agent. Follow instructions precisely.
Working directory: ${sandbox.workingDirectory}
Paths in this repo are under lib/, not src/. If a path is missing, grep for the file name.
To rename a variable: read the file, write the full updated contents, then run \`npx tsc --noEmit\`.
Do NOT ask questions. Do NOT explore beyond what's needed. After tools succeed, write a short final report.`,
                    tools: {
                        read: parentTools.read,
                        grep: parentTools.grep,
                        write: parentTools.write,
                        bash: executorBash,
                    },
                    stopWhen: stepCountIs(15),
                    maxRetries: 0,
                    onStepFinish: ({ stepNumber, toolCalls }) => {
                        console.error(
                            `[task] executor step ${stepNumber}: ${toolCalls.map((c) => c.toolName).join(", ") || "text"}`,
                        );
                    },
                });

                try {
                    const { text, steps } = await executor.generate({ prompt: description });
                    return formatSubagentResult("Executor", text, steps.length);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return `Executor error: ${message}`;
                }
            }

            const explorer = new ToolLoopAgent({
                model: await createLocalModel(process.env.LOCAL_EXPLORER_MODEL),
                instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}
Paths in this repo are under lib/, not src/. If a path is missing, grep for the file name.
After tools succeed, write a short final report.`,
                tools: { read: parentTools.read, grep: parentTools.grep },
                stopWhen: stepCountIs(5),
                maxRetries: 0,
            });

            try {
                const { text, steps } = await explorer.generate({ prompt: description });
                return formatSubagentResult("Explorer", text, steps.length);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return `Explorer error: ${message}`;
            }
        },
    });
}

function formatSubagentResult(role: string, text: string | undefined, stepCount: number) {
    const body = text?.trim();
    console.error(
        `[task] ${role.toLowerCase()} steps=${stepCount} textLength=${body?.length ?? 0}`,
    );
    return body
        ? `[${role}: ${stepCount} steps]\n${body}`
        : `[${role}: ${stepCount} steps]\n(no final text — the model used the whole step budget on tool calls)`;
}
