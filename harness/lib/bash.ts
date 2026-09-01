import { execSync } from "node:child_process";
import { z } from "zod";
import { tool } from "./tool.ts";

export type BashOperations = {
  exec(command: string): Promise<{ stdout: string; exitCode: number }>;
};

export function createLocalOps(cwd: string): BashOperations {
  return {
    async exec(command) {
      try {
        const stdout = execSync(command, {
          cwd,
          encoding: "utf-8",
          timeout: 30_000,
          stdio: ["ignore", "pipe", "pipe"],
        });
        return { stdout, exitCode: 0 };
      } catch (err) {
        const failure = err as {
          status?: number | null;
          stdout?: string;
          stderr?: string;
          message?: string;
          killed?: boolean;
        };
        if (failure.killed) {
          return { stdout: "(bash timed out)", exitCode: 124 };
        }
        return {
          stdout: (failure.stdout || failure.stderr || failure.message || "").trim(),
          exitCode: failure.status ?? 1,
        };
      }
    },
  };
}

export function createBashTool(
  operations: BashOperations,
  needsApproval: (input: { command: string }) => boolean,
) {
  return tool({
    description: `Execute a shell command in the working directory.
 
WHEN TO USE: running build commands, installing packages, running tests,
  git operations, directory listings.
 
WHEN NOT TO USE: reading file contents (use read instead).
  Searching for patterns (use grep instead).
 
DO NOT USE FOR: reading files (use read), searching code (use grep).
 
USAGE: command is a single shell string. Commands not approved by the
  approval policy are blocked and return a clear error message.`,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }) => {
      if (needsApproval({ command })) {
        return `Blocked: "${command}" requires approval.`;
      }
      const { stdout } = await operations.exec(command);
      return stdout || "(no output)";
    },
  });
}

