import { createInterface } from "node:readline/promises";
import { tool } from "ai";
import { z } from "zod";

export function formatAskOptions(options: readonly string[]): string {
  return options.map((option, index) => `${index + 1}. ${option}`).join("\n");
}

export function parseAskChoice(
  line: string,
  options: readonly string[],
): string | null {
  const trimmed = line.trim();
  if (!trimmed || options.length === 0) {
    return null;
  }

  const index = Number.parseInt(trimmed, 10);
  if (
    Number.isInteger(index) &&
    index >= 1 &&
    index <= options.length
  ) {
    return options[index - 1] ?? null;
  }

  const lower = trimmed.toLowerCase();
  return options.find((option) => option.toLowerCase() === lower) ?? null;
}

async function promptAskChoice(
  question: string,
  options: string[],
): Promise<string> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    return "Cannot ask user: no interactive terminal (stdin/stderr TTY required).";
  }

  console.error(`\nQuestion: ${question}\n${formatAskOptions(options)}\n`);
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    while (true) {
      const answer = await rl.question(
        `Choice [1-${options.length}]: `,
      );
      const choice = parseAskChoice(answer, options);
      if (choice) {
        return `User chose: "${choice}"`;
      }
      console.error("Invalid choice. Enter a number or option text.");
    }
  } finally {
    rl.close();
  }
}

export function createAskUserTool() {
  return tool({
    description: `Ask the user a multiple-choice question.
    WHEN TO USE: scoping ambiguous tasks, choosing between approaches, resolving a missing detail before acting.
    WHEN NOT TO USE: you already have enough context to proceed; a listed skill applies and you have not called loadSkill yet.
    DO NOT USE FOR: rhetorical questions or progress updates.`,
    inputSchema: z.object({
      question: z.string().describe("The question to ask the user"),
      options: z
        .array(z.string())
        .min(2)
        .max(4)
        .describe("Two to four options for the user to pick from"),
    }),
    execute: async ({ question, options }) =>
      promptAskChoice(question, options),
  });
}
