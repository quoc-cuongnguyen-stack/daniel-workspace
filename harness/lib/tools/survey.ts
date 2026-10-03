import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import {
    createModel,
    DEFAULT_EXPLORER_MODEL,
} from "../model.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { createGrepTool } from "./grep.ts";
import { createReadTool } from "./read.ts";

type SurveyTools = {
    read: ReturnType<typeof createReadTool>;
    grep: ReturnType<typeof createGrepTool>;
};

const SURVEY_READ_CAPS = { readLines: 80 };
const SURVEY_GREP_CAPS = { grepMatches: 20 };
const MAX_FILES = 12;

function buildSurveyExplorer(sandbox: Sandbox) {
    const read = createReadTool(sandbox, SURVEY_READ_CAPS);
    const grep = createGrepTool(sandbox, SURVEY_GREP_CAPS);

    return new ToolLoopAgent({
        model: createModel(process.env.EXPLORER_MODEL ?? DEFAULT_EXPLORER_MODEL),
        instructions: `You are a survey explorer. Read-only.
Working directory: ${sandbox.workingDirectory}
Given the question, search then read only what you need.
Return ONLY lines of the form:
path — one-line role
Max ${MAX_FILES} files. No prose, no bullets, no headers.
If nothing relevant, return: (no matching files)`,
        tools: { read, grep },
        stopWhen: stepCountIs(5),
    });
}

export function createSurveyTool(sandbox: Sandbox, _parentTools: SurveyTools) {
    return tool({
        description: `Map a high-level architecture question to relevant files.
Returns a list of paths with a one-line role for each.

WHEN TO USE: "how is X handled", "where does Y live", cross-cutting architecture
  questions that do not map to a single grep pattern.

WHEN NOT TO USE: the user named a specific file (use read),
  you can grep for a symbol or regex (use grep),
  the user asked to delegate (use task),
  you need a narrative report instead of a file map (use task explorer).

DO NOT USE FOR: reading a known file, keyword search, or implementation work.`,
        inputSchema: z.object({
            question: z
                .string()
                .describe("High-level architecture or cross-cutting question"),
        }),
        execute: async ({ question }) => {
            console.error(`[tool] survey execute question=${question}`);
            const agent = buildSurveyExplorer(sandbox);
            try {
                const { text, steps } = await agent.generate({ prompt: question });
                const body = text?.trim() ?? "(no matching files)";
                return `[survey: ${steps.length} steps]\n${body}`;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return `survey error: ${message}`;
            }
        },
    });
}
