import { isAbsolute, relative, resolve } from "node:path";
import z from "zod";
import type { Sandbox } from "../sandbox/sandbox.ts";
import { tool } from "./tool.ts";

export function createReadTool(sandbox: Sandbox) {
    return tool({
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
        const root = resolve(sandbox.workingDirectory);
        const abs = resolve(root, filePath);
        const rel = relative(root, abs);
        if (rel.startsWith("..") || isAbsolute(rel)) {
        return `Blocked: path escapes working directory`;
        }

        const content = await sandbox.readFile(filePath);
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
}
