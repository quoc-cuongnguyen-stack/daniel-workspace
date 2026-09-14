import { tool } from "ai";
import { z } from "zod";

export function createAskUserTool() {
    return tool({
        description: `Ask the user a multiple-choice question.
    WHEN TO USE: scoping ambiguous tasks, choosing between approaches, resolving a missing detail before acting.
    WHEN NOT TO USE: you already have enough context to proceed.
    DO NOT USE FOR: rhetorical questions or progress updates.`,
        inputSchema: z.object({
            question: z.string().describe("The question to ask the user"),
            options: z
                .array(z.string())
                .min(2)
                .max(4)
                .describe("Two to four options for the user to pick from"),
        }),
        execute: async ({ question, options }) => {
            const formatted = options.map((o, i) => `${i + 1}. ${o}`).join("\n");
            console.log(`\nQuestion: ${question}\n${formatted}\n`);
            return `Asked: "${question}"\nOptions:\n${formatted}\n\n(Awaiting user response.)`;
        },
    });
}