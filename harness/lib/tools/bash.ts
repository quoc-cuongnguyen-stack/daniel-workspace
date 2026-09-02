import { z } from "zod";
import type { ApprovalGate } from "./mode-approval.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { tool } from "./tool.ts";

export function createBashTool(sandbox: Sandbox, gate: ApprovalGate) {
  return tool({
    description: `Execute a shell command in the working directory.
 
  WHEN TO USE: running build commands, installing packages, running tests,
    git operations, directory listings. Command "trust --list" prints the
    always-allowed prefixes and this session's approved commands.
    
  WHEN NOT TO USE: reading file contents (use read instead).
    Searching for patterns (use grep instead).
    
  DO NOT USE FOR: reading files (use read), searching code (use grep).
    
  USAGE: command is a single shell string. Commands not approved by the
    approval policy are blocked and return a clear error message.`,
    inputSchema: z.object({
      command: z.string().describe("Shell command to execute"),
    }),
    execute: async ({ command }) => {
      const cmd = command.trim();
      if (cmd === "trust --list") {
        return gate.formatTrustList();
      }
      if (gate.needsApproval({ command: cmd })) {
        const allowed = await gate.tryApprove(cmd);
        if (!allowed) {
          return `Blocked: "${cmd}" requires approval.`;
        }
      }
      const { stdout } = await sandbox.exec(cmd);
      return stdout || "(no output)";
    },
  });
}

