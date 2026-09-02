import { isAbsolute, relative, resolve } from "node:path";
import z from "zod";
import type { WritableSandbox } from "./sandbox.ts";
import { tool } from "./tool.ts";

export function createWriteTool(sandbox: WritableSandbox) {
  return tool({
    description: `Write a file in the project. Overwrites if it exists.

    WHEN TO USE: creating new files, replacing file contents.
      
    WHEN NOT TO USE: reading a file (use read instead).
    Searching across files (use grep instead). Running commands (use bash instead).
      
    DO NOT USE FOR: reading files (use read), searching code (use grep).
      
    USAGE: path is relative to working directory. content is the full file body.`,
    inputSchema: z.object({
      path: z.string().describe("File path relative to working directory"),
      content: z.string().describe("Full contents to write"),
    }),
    execute: async ({ path: filePath, content }) => {
      const root = resolve(sandbox.workingDirectory);
      const abs = resolve(root, filePath);
      const rel = relative(root, abs);
      if (rel.startsWith("..") || isAbsolute(rel)) {
        return `Blocked: path escapes working directory`;
      }
      await sandbox.writeFile(filePath, content);
      return `Wrote ${filePath}`;
    },
  });
}
