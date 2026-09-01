import { Agent, type ConversationStep, type Run, type SDKCustomTool } from "@cursor/sdk";
import { resolve } from "node:path";
import { createTools } from "./lib/tools.ts";

const cwd = resolve(process.argv[2] || process.cwd());

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
      disallowedTools: ["read", "grep", "shell", "glob", "ls"],
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

const agent = new ToolLoopAgent({
  model: "claude-haiku-4-5",
  instructions: `You are a coding agent working in: ${cwd}
  # Agency
  - USE your tools. Read files, search code, run commands, then answer.
  - Do NOT explain what you WOULD do. Actually do it.
  - Prefer grep for searching, read for viewing files.
  - Use bash only for commands that aren't covered by other tools.

  # Guardrails
  - Prefer simple, minimal changes
  - Search before creating, and reuse existing patterns
  - No new dependencies without asking`,
  tools: createTools(cwd),
  stopWhen: stepCountIs(10),
});

const prompt = process.argv.slice(3).join(" ") || "Hello!";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
