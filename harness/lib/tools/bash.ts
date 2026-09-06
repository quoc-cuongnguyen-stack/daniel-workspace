import { z } from "zod";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { resolveToolCaps, type ToolCaps } from "./caps.ts";
import { tool } from "./tool.ts";

export function createBashTool(
  sandbox: Sandbox,
  needsApproval: (input: { command: string }) => boolean,
  caps?: Partial<ToolCaps>,
) {
  const { bashChars: MAX_BASH_CHARS } = resolveToolCaps(caps);

  return tool({
    description: `Execute a shell command in the working directory.

WHEN TO USE: running build commands, installing packages, running tests,
git operations, directory listings.

WHEN NOT TO USE: reading file contents (use read instead).
Searching for patterns (use grep instead).

DO NOT USE FOR: reading files (use read), searching code (use grep).

USAGE: command is a single shell string. Commands not approved by the
approval policy are blocked and return a clear error message.
Stdout is capped at ${MAX_BASH_CHARS} characters (tail kept).

EXAMPLES:
- List files: command "ls -la"
- Check git status: command "git status"
- Run a test suite: command "npm test"`,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }: { command: string }) => {
      if (needsApproval({ command })) {
        return `Blocked: "${command}" requires approval.`;
      }
      const result = await sandbox.exec(command);
      const stdout = result.stdout || "(no output)";
      return stdout.length > MAX_BASH_CHARS
        ? stdout.slice(-MAX_BASH_CHARS) +
            `\n... (truncated, showing last ${MAX_BASH_CHARS} chars)`
        : stdout;
    },
  });
}
