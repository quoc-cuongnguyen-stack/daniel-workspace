import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { SDKCustomTool } from "@cursor/sdk";
import { z } from "zod";
import { createApproval } from "./mode-approval.ts";
import { createBashTool, createLocalOps } from "./bash.ts";
import { shQuote } from "./sh-quote.ts";
import { tool } from "./tool.ts";

export function createTools(workingDir: string): Record<string, SDKCustomTool> {
  const localOps = createLocalOps(workingDir);
  const bash = createBashTool(localOps, createApproval({ mode: "interactive" }));
  

  const grep = tool({
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

       let stdout = "";
       try {
         stdout = execSync(cmd, {
           cwd: workingDir,
           encoding: "utf8",
           maxBuffer: 8_000_000,
           timeout: 60_000,
           stdio: ["ignore", "pipe", "pipe"],
         });
      } catch (err) {
        const failure = err as { status?: number; stdout?: string; killed?: boolean };
        if (failure.killed) return "(grep timed out)";
        // 1 = no matches; 2 = some files unreadable (sockets) but stdout still usable
        if (failure.status !== 1 && failure.status !== 2) throw err;
        stdout = failure.stdout ?? "";
      }

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

  const read = tool({
    description: `Read a file from the project. Returns numbered lines.
    
    WHEN TO USE: viewing file contents, checking configurations, reading source code,
    examining specific lines with offset/limit.
    
    WHEN NOT TO USE: searching for patterns across files (use grep instead).
    Running commands (use bash instead).
    
    DO NOT USE FOR: searching code (use grep), executing commands (use bash),
    modifying files (use edit or write).
    
    USAGE: path is relative to working directory. offset and limit are optional.
    Output is capped at 500 lines.`,

    inputSchema: z.object({
      path: z.string().describe("File path relative to working directory"),
      offset: z.number().optional().describe("Start line (1-indexed)"),
      limit: z.number().optional().describe("Max lines to return"),
    }),
     execute: async ({ path: filePath, offset, limit }) => {
       const root = resolve(workingDir);
       const abs = resolve(root, filePath);
      const rel = relative(root, abs);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        return `Blocked: path escapes working directory`;
      }
      const content = readFileSync(abs, "utf-8");
      let lines = content.split("\n");
      console.error(`[tool] read execute path=${filePath} abs=${abs} lines=${lines.length}`);

      if (offset) lines = lines.slice(offset - 1);
      if (limit) lines = lines.slice(0, limit);

      const MAX_LINES = 500;
      const truncated = lines.length > MAX_LINES;
      if (truncated) lines = lines.slice(0, MAX_LINES);

      const numbered = lines.map((l, i) => `${(offset || 1) + i}: ${l}`);
      return truncated
        ? numbered.join("\n") + `\n... (truncated at ${MAX_LINES} lines)`
        : numbered.join("\n");
    },
  });

  return { read, grep, bash };
}

