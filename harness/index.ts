import { Agent, type ConversationStep, type Run, type SDKCustomTool, type SDKJsonValue } from "@cursor/sdk";
import { z } from "zod";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = resolve(process.argv[2] || process.cwd());

const stepCountIs = (n: number) => n;

function shQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function tool<T extends z.ZodType>({
  description,
  inputSchema,
  execute,
}: {
  description: string;
  inputSchema: T;
  execute: (args: z.infer<T>) => Promise<string>;
}): SDKCustomTool {
  return {
    description,
    inputSchema: z.toJSONSchema(inputSchema) as Record<string, SDKJsonValue>,
    execute: async (args) => execute(inputSchema.parse(args)),
  };
}

class ToolLoopAgent {
  opts: {
    model: string;
    instructions: string;
    tools: Record<string, SDKCustomTool>;
    stopWhen: number;
  };

  constructor(opts: ToolLoopAgent["opts"]) {
    this.opts = opts;
  }

  async generate({ prompt }: { prompt: string }) {
    const cursor = await Agent.create({
      model: { id: this.opts.model },
      apiKey: process.env.CURSOR_API_KEY,
      disallowedTools: ["read", "grep", "shell", "glob", "ls"],
      local: { cwd, customTools: this.opts.tools },
    });
    try {
      const steps: ConversationStep[] = [];
      let run: Run;
      run = await cursor.send(`${this.opts.instructions}\n\n${prompt}`, {
        onStep: ({ step }) => {
          steps.push(step);
          if (step.type === "toolCall") {
            const msg = step.message as { type: string; args?: Record<string, unknown> };
            console.error(`[tool] ${msg.type} ${JSON.stringify(msg.args ?? {}).slice(0, 180)}`);
          }
          if (steps.length >= this.opts.stopWhen) void run.cancel();
        },
      });
      const { result: text } = await run.wait();
      return { text, steps };
    } finally {
      await cursor[Symbol.asyncDispose]();
    }
  }
}

const SAFE_PREFIXES = ["ls", "cat", "pwd", "git status", "git log", "git diff"];

// ponytail: prefix+space, not a parser. `ls && rm` still matches `ls`. Split/AST if chaining becomes a problem.
function isSafe(command: string) {
  const cmd = command.trim();
  return SAFE_PREFIXES.some((prefix) => cmd === prefix || cmd.startsWith(prefix + " "));
}

{
  const check = (c: string, want: boolean) => {
    if (isSafe(c) !== want) throw new Error(`isSafe(${JSON.stringify(c)}) !== ${want}`);
  };
  check("ls -la", true);
  check("lsof", false);
  check("rm -rf /", false);
  check("git status", true);
  check("git stash", false);
  check("cat index.ts", true);
}

const bash = tool({
  description: `Run one read-only shell command. Allowlist is enforced in execute — unsafe commands return a block message, they are not run.

WHEN TO USE: list a directory (ls), print cwd (pwd), cat a file the user asked to dump via shell, or git status / git log / git diff.
WHEN NOT TO USE: open a named source/config file — call read. Search a pattern across files — call grep.
DO NOT USE FOR: writes, installs, rm, chmod, git commit/push, pipes, sudo, or any command whose prefix is not in the allowlist.
EXAMPLES: "list files" → bash({command:"ls -la"}). "where am I" → bash({command:"pwd"}). "git status" → bash({command:"git status"}).`,
  inputSchema: z.object({
    command: z.string().describe("Full shell command, e.g. ls -la"),
  }),
  execute: async ({ command }) => {
    console.error(`[tool] bash execute command=${command}`);
    if (!isSafe(command)) {
      return `Blocked: ${command}\nAllowed prefixes: ${SAFE_PREFIXES.join(", ")}`;
    }
    try {
      return execSync(command, {
        cwd,
        encoding: "utf8",
        timeout: 15_000,
        maxBuffer: 1_000_000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      const failure = err as { status?: number; stdout?: string; stderr?: string; killed?: boolean };
      if (failure.killed) return "(bash timed out)";
      const out = `${failure.stdout ?? ""}${failure.stderr ?? ""}`.trim();
      return out || `exit ${failure.status ?? "unknown"}`;
    }
  },
});

const grep = tool({
  description: `Search file contents using regex. Returns matching lines with file paths.
WHEN TO USE: finding patterns across multiple files, locating function definitions,
  searching for imports, finding TODOs or error messages.
WHEN NOT TO USE: reading a known file (use read instead).
DO NOT USE FOR: running commands, listing directories.
EXAMPLES:
  - Find all TODO comments: pattern "TODO" glob "*.ts"
  - Find function definitions: pattern "function \\\\w+" glob "*.ts"`,
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
        cwd,
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
  WHEN TO USE: viewing file contents, checking configs, reading source code.
  WHEN NOT TO USE: searching across files (use grep instead).
  DO NOT USE FOR: running commands, listing directories.`,
  inputSchema: z.object({
    path: z.string().describe("File path relative to working directory"),
    offset: z.number().optional().describe("Start line (1-indexed)"),
    limit: z.number().optional().describe("Max lines to return"),
  }),
  execute: async ({ path: filePath, offset, limit }) => {
    const abs = resolve(cwd, filePath);
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

const agent = new ToolLoopAgent({
  model: "claude-haiku-4-5",
  instructions: `You are a coding agent.\nWorking directory: ${cwd}\nSearch with grep. Open a named file with read. List dirs / pwd / git status|log|diff with bash. Never use builtin shell/glob/ls.`,
  tools: { read, grep, bash },
  stopWhen: stepCountIs(10),
});

const prompt = process.argv.slice(3).join(" ") || "Hello!";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
