import { Agent, type ConversationStep, type SDKCustomTool } from "@cursor/sdk";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createTokenMeter, type TokenMeter } from "./lib/token-estimate.ts";
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

// Cursor emits one ConversationStep per event, so a single model turn arrives as
// thinkingMessage plus toolCall or assistantMessage. Only the decision-bearing
// events count as a step.
const isModelTurn = (step: ConversationStep) =>
  step.type === "toolCall" || step.type === "assistantMessage";

// The runtime owns the loop, so both the step budget and the context accounting
// are enforced where we do have control: inside the tools. Refusing lets the
// model write a real answer, which cancelling the run does not.
function wrapTools(
  tools: Record<string, SDKCustomTool>,
  maxToolCalls: number,
  meter: TokenMeter,
): Record<string, SDKCustomTool> {
  let used = 0;
  return Object.fromEntries(
    Object.entries(tools).map(([name, t]) => [
      name,
      {
        ...t,
        execute: async (args, context) => {
          used += 1;
          if (used > maxToolCalls) {
            return "Step budget exhausted. Do not call any more tools. Summarize what you already found and give your final answer.";
          }
          const result = await t.execute(args, context);
          // This is why the estimate can work at all: every tool result the model
          // will re-read on later turns passes through here first.
          meter.addContext(typeof result === "string" ? result : JSON.stringify(result));
          return result;
        },
      },
    ]),
  );
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
    const sent = `${this.opts.instructions}\n\n${prompt}`;
    const meter = createTokenMeter(sent);

    const cursor = await Agent.create({
      model: { id: this.opts.model },
      apiKey: process.env.CURSOR_API_KEY,
      disallowedTools: ["read", "grep", "shell", "glob", "ls", "edit", "delete"],
      local: {
        cwd,
        // One step is reserved for the closing answer.
        customTools: wrapTools(this.opts.tools, this.opts.stopWhen - 1, meter),
      },
    });

    try {
      const steps: ConversationStep[] = [];

      const run = await cursor.send(sent, {
        onStep: ({ step }) => {
          if (step.type === "thinkingMessage") {
            meter.addOutput(step.message.text);
            return;
          }

          let args: Record<string, unknown> = {};
          if (step.type === "toolCall") {
            const msg = step.message as { type: string; args?: Record<string, unknown> };
            args = msg.args ?? {};
            console.error(`[tool] ${msg.type} ${JSON.stringify(args).slice(0, 180)}`);
          }

          if (!isModelTurn(step)) return;
          steps.push(step);

          // A toolCall event arrives after the tool ran, so step.message carries the
          // result as well. The model only produced the arguments.
          const produced =
            step.type === "assistantMessage" ? step.message.text : JSON.stringify(args);
          const usage = meter.step(produced);
          console.error(
            `Step ${usage.step}: ~${usage.inputTokens} input, ~${usage.outputTokens} output`,
          );
        },
      });
      const { result: text } = await run.wait();
      return { text, steps, meter, usage: run.usage };
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
  // Defaults stay 500 / 50 / 5000. Pass Partial<ToolCaps> when spawning a
  // specialized agent, e.g. { readLines: 100 } for a quick subagent.
  read: createReadTool(sandbox),
  grep: createGrepTool(sandbox),
  bash: createBashTool(sandbox, createApproval({ mode: "interactive" }).needsApproval),
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
const { text, steps, meter, usage } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);

const est = meter.totals();
console.error(
  `\n[estimate] ${est.inputTokens} input, ${est.outputTokens} output across ${est.steps} steps`,
);
if (usage) {
  console.error(
    `[actual]   ${usage.inputTokens} input, ${usage.outputTokens} output, ` +
      `${usage.cacheReadTokens} cache read, ${usage.cacheWriteTokens} cache write`,
  );
} else {
  console.error(`[actual]   not reported by the runtime for this run`);
}
