import { z } from "zod";
import { shQuote } from "../sh-quote.ts";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { tool } from "ai";
import { resolveToolCaps, type ToolCaps } from "./caps.ts";

export function createGrepTool(sandbox: Sandbox, caps?: Partial<ToolCaps>) {
  const { grepMatches: MAX_MATCHES } = resolveToolCaps(caps);

  return tool({
    description: `Search file contents using regex. Returns matching lines with file paths.

WHEN TO USE: finding patterns across multiple files, locating function definitions,
searching for imports, finding TODOs or error messages.

WHEN NOT TO USE: reading a known file (use read instead).
Running commands (use bash instead).

DO NOT USE FOR: reading files (use read), listing directories (use bash),
modifying files (use edit).

USAGE: pattern is a regex string. glob filters by file extension.
Results are capped at ${MAX_MATCHES} matches.

EXAMPLES:
- Find all TODO comments: pattern "TODO" glob "*.ts"
- Find function definitions: pattern "function \\w+" glob "*.ts"
- Find imports of a package: pattern "from 'express'" glob "*.ts"`,
    inputSchema: z.object({
      pattern: z.string().describe("Regex or fixed text to search for"),
      path: z
        .string()
        .optional()
        .describe("Directory or file relative to working directory (default: .)"),
      glob: z
        .string()
        .optional()
        .describe("Only search files matching this glob, e.g. *.ts"),
    }),
    execute: async ({
      pattern,
      path: searchPath,
      glob,
    }: {
      pattern: string;
      path?: string;
      glob?: string;
    }) => {
      console.error(
        `[tool] grep pattern=${pattern} path=${searchPath ?? "."} glob=${glob ?? ""}`,
      );
      let cmd = `grep -rn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.pnpm-store --exclude-dir=.codegraph`;
      if (glob) cmd += ` --include=${shQuote(glob)}`;
      cmd += ` -E ${shQuote(pattern)} -- ${shQuote(searchPath || ".")}`;

      const { stdout, exitCode } = await sandbox.exec(cmd);
      if (exitCode === 124) return "(grep timed out)";

      const matches = stdout === "" ? [] : stdout.split("\n").filter(Boolean);
      const total = matches.length;
      const shown = matches.slice(0, MAX_MATCHES);
      const body = shown.join("\n");
      const suffix =
        total > MAX_MATCHES
          ? `\n(${total} matches, showing first ${MAX_MATCHES})`
          : `\n(${total} matches)`;
      return body ? body + suffix : `(0 matches)`;
    },
  });
}
