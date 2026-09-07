import { ToolLoopAgent, pruneMessages, stepCountIs } from "ai";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { addCacheControl } from "./lib/cache.ts";
import { createLocalModel } from "./lib/model.ts";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createJustBashSandbox } from "./lib/sandbox/sandbox-just-bash.ts";
import { createLocalSandbox } from "./lib/sandbox/sandbox-local.ts";
import { buildSystemPrompt } from "./lib/system-prompt.ts";
import { createBashTool } from "./lib/tools/bash.ts";
import { createGrepTool } from "./lib/tools/grep.ts";
import { createApproval } from "./lib/tools/mode-approval.ts";
import { limitOneToolPerTurn } from "./lib/tools/one-per-turn.ts";
import { createReadTool } from "./lib/tools/read.ts";

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

const sandboxType = process.env.SANDBOX || "local";
const sandbox =
  sandboxType === "just-bash"
    ? await createJustBashSandbox(cwd)
    : createLocalSandbox(cwd);

console.error(`Sandbox: ${sandbox.type}`);

const model = await createLocalModel();
const { tools, resetTurn } = limitOneToolPerTurn({
  read: createReadTool(sandbox),
  grep: createGrepTool(sandbox),
  bash: createBashTool(sandbox, createApproval({ mode: "interactive" }).needsApproval),
});

const instructions = buildSystemPrompt({
  workingDirectory: sandbox.workingDirectory,
  sandboxType: sandbox.type,
  toolNames: Object.keys(tools),
  scripts: readPackageScripts(cwd),
  projectContext,
});

const agent = new ToolLoopAgent({
  model,
  instructions,
  tools,
  stopWhen: stepCountIs(15),
  maxRetries: 0,
  onStepStart: () => {
    resetTurn();
  },
  onStepFinish: ({ usage, stepNumber }) => {
    console.error(
      `Step ${stepNumber}: ${usage.inputTokens} input, ${usage.outputTokens} output, ${usage.inputTokenDetails.cacheReadTokens ?? 0} cached`,
    );
  },
  // AI SDK 7: prepareCall runs once at generate() start (messages is undefined).
  // prepareStep runs before every model call — prune then mark stable prefix.
  prepareStep: ({ messages }) => {
    const pruned = pruneMessages({
      messages,
      toolCalls: "before-last-3-messages",
    });
    return { messages: addCacheControl(pruned) };
  },
});

const prompt = process.argv.slice(3).join(" ") || "Hello!";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
