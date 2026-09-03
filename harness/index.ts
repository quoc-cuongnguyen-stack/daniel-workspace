import { Agent, type ConversationStep, type Run, type SDKCustomTool } from "@cursor/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createLocalSandbox } from "./lib/sandbox/sandbox-local.ts";
import { buildSystemPrompt } from "./lib/system-prompt.ts";
import { createGrepTool } from "./lib/tools/grep.ts";
import { createReadTool } from "./lib/tools/read.ts";
import { createBashTool } from "./lib/tools/bash.ts";
import { createApproval } from "./lib/tools/mode-approval.ts";
import { createJustBashSandbox } from "./lib/sandbox/sandbox-just-bash.ts";

const cwd = resolve(process.argv[2] || process.cwd());
const projectContext = collectAgentsMd(cwd);

function readPackageScripts(dir: string): Record<string, string> {
  try {
    const pkg = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf-8")) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

const stepCountIs = (n: number) => n;

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
      disallowedTools: ["read", "grep", "shell", "glob", "ls", "edit", "delete"],
      local: { cwd, customTools: this.opts.tools },
    });
    
    try {

      const steps: ConversationStep[] = [];
      let run: Run;

      run = await cursor.send(`${this.opts.instructions}\n\n${prompt}`, {

        onStep: ({ step }) => {

          steps.push(step);

          if (step.type === "toolCall")
          {
            const msg = step.message as { type: string; args?: Record<string, unknown> };
            console.error(`[tool] ${msg.type} ${JSON.stringify(msg.args ?? {}).slice(0, 180)}`);
          }

          if (steps.length >= this.opts.stopWhen) {
            void run.cancel();
          }

        },
      });
      const { result: text } = await run.wait();
      return { text, steps };
    } finally {
      await cursor[Symbol.asyncDispose]();
    }
  }
}
const sandboxType = process.env.SANDBOX || "local";

const sandbox =
  sandboxType === "just-bash"
    ? await createJustBashSandbox(cwd)
    : createLocalSandbox(cwd);

console.error(`Sandbox: ${sandbox.type}`);

const tools = {
  read: createReadTool(sandbox),
  grep: createGrepTool(sandbox),
  bash: createBashTool(sandbox, createApproval({ mode: "interactive" })),
};

const instructions = buildSystemPrompt({
  workingDirectory: sandbox.workingDirectory,
  sandboxType: sandbox.type,
  toolNames: Object.keys(tools),
  scripts: readPackageScripts(cwd),
  projectContext,
});

const agent = new ToolLoopAgent({
  model: "claude-haiku-4-5",
  instructions,
  tools,
  stopWhen: stepCountIs(10),
});


const prompt = process.argv.slice(3).join(" ") || "Hello!";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
