import { execSync } from "node:child_process";
import { z } from "zod";
import { isSafe } from "./is-safe.ts";
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

export function createBashTool(operations: BashOperations, safePrefixes: string[]) {
  return tool({
    description: `Execute a shell command in the working directory.

    WHEN TO USE: running build commands, installing packages, running tests,
    git operations, directory listings.
    
    WHEN NOT TO USE: reading file contents (use read instead).
    Searching for patterns (use grep instead).
    
    DO NOT USE FOR: reading files (use read), searching code (use grep).
    
    USAGE: command is a single shell string. Commands not in the safe-prefix
    allowlist are blocked and return a clear error message.
    
    EXAMPLES:
    - List files: command "ls -la"
    - Check git status: command "git status"
    - Run a test suite: command "npm test"`,
    inputSchema: z.object({
      command: z.string().describe("Full shell command, e.g. ls -la"),
    }),
    execute: async ({ command }) => {
      console.error(`[tool] bash execute command=${command}`);
      if (!isSafe(command, safePrefixes)) {
        return `Blocked: ${command}\nAllowed prefixes: ${safePrefixes.join(", ")}`;
      }
      const { stdout } = await operations.exec(command);
      return stdout || "(no output)";
    },
  });
}
