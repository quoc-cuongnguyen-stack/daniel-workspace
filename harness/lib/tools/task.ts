import { ToolLoopAgent, stepCountIs, tool, type LanguageModel } from "ai";
import { z } from "zod";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { createGrepTool } from "./grep.ts";
import { createReadTool } from "./read.ts";

export function createTaskTool(
  sandbox: Sandbox,
  parentTools: {
    read: ReturnType<typeof createReadTool>;
    grep: ReturnType<typeof createGrepTool>;
  },
  model: LanguageModel,
) {
    return tool({
    description: `Delegate research to a read-only subagent.
WHEN TO USE: investigating a codebase, finding patterns, gathering context
across many files.
WHEN NOT TO USE: making changes (the subagent cannot write or run commands).
DO NOT USE FOR: tasks that need decisions or askUser interactions.`,
    inputSchema: z.object({
    description: z.string().describe("What the subagent should investigate"),
    }),
    execute: async ({ description }) => {
        const explorer = new ToolLoopAgent({
        model,
        instructions: `You are an explorer agent. Investigate and report back concisely.
Working directory: ${sandbox.workingDirectory}`,
        tools: { read: parentTools.read, grep: parentTools.grep },
        stopWhen: stepCountIs(5),
        maxRetries: 0,
        });

    try {
        const { text, steps } = await explorer.generate({ prompt: description });
        console.error(
            `[task] explorer steps=${steps.length} textLength=${text?.length ?? 0}`,
        );
        return text
            ? `[Explorer: ${steps.length} steps]\n${text}`
            : "(no response from subagent)";
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Subagent error: ${message}`;
    }
    },
});
}
