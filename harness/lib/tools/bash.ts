import { tool } from "ai";
import { z } from "zod";
import type { ApprovalGate } from "../approved-mode/mode-approval.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";

type NeedsApproval = ApprovalGate | ((input: { command: string }) => boolean);

export function createBashTool(sandbox: Sandbox, approval: NeedsApproval) {
  const needsApproval =
    typeof approval === "function" ? approval : approval.needsApproval;
  const MAX_BASH_CHARS = 5000;

  return tool({
    description: `Execute a shell command in the working directory.
WHEN TO USE: build commands, package install, tests, git, directory listings.
WHEN NOT TO USE: reading file contents (use read).
DO NOT USE FOR: reading files (use read), searching code (use grep).`,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }) => {
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