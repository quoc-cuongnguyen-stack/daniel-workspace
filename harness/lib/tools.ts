import type { SDKCustomTool } from "@cursor/sdk";
import { z } from "zod";
import { createApproval } from "./mode-approval.ts";
import { createBashTool } from "./bash.ts";
import { createReadTool } from "./read.ts";
import { createWriteTool } from "./write.ts";
import { shQuote } from "./sh-quote.ts";
import type { Sandbox, WritableSandbox } from "./sandbox.ts";
import { tool } from "./tool.ts";

export function createGrepTool(sandbox: Sandbox) {
  return tool({
    description: `Search file contents using regex. Returns matching lines with file paths.

    WHEN TO USE: finding patterns across multiple files, locating function definitions,
    searching for imports, finding TODOs or error messages.
    
    WHEN NOT TO USE: reading a known file (use read instead).
    Running commands (use bash instead).
    
    DO NOT USE FOR: reading files (use read), listing directories (use bash),
    modifying files (use edit).
    
    USAGE: pattern is a regex string. glob filters by file extension.
    Results are capped at 50 matches.
    
    EXAMPLES:
    - Find all TODO comments: pattern "TODO" glob "*.ts"
    - Find function definitions: pattern "function \\w+" glob "*.ts"
    - Find imports of a package: pattern "from 'express'" glob "*.ts"`,
    inputSchema: z.object({
      pattern: z.string().describe("Regex or fixed text to search for"),
      path: z.string().optional().describe("Directory or file relative to working directory (default: .)"),
      glob: z.string().optional().describe("Only search files matching this glob, e.g. *.ts"),
    }),
    execute: async ({ pattern, path: searchPath, glob }) => {
      console.error(`[tool] grep pattern=${pattern} path=${searchPath ?? "."} glob=${glob ?? ""}`);
      let cmd = `grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.pnpm-store --exclude-dir=.codegraph`;
      if (glob) cmd += ` --include=${shQuote(glob)}`;
      cmd += ` -e ${shQuote(pattern)} -- ${shQuote(searchPath || ".")}`;

      const { stdout, exitCode } = await sandbox.exec(cmd);
      if (exitCode === 124) return "(grep timed out)";

      const matches = stdout === "" ? [] : stdout.split("\n").filter(Boolean);
      const total = matches.length;
      const shown = matches.slice(0, 50);
      const body = shown.join("\n");
      const suffix =
        total > 50
          ? `\n(${total} matches, showing first 50)`
          : `\n(${total} matches)`;
      return body ? body + suffix : `(0 matches)`;
    },
  });
}

export function createTools(sandbox: WritableSandbox): Record<string, SDKCustomTool> {
  return {
    read: createReadTool(sandbox),
    grep: createGrepTool(sandbox),
    bash: createBashTool(sandbox, createApproval({ mode: "interactive" })),
    write: createWriteTool(sandbox),
  };
}
