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

const tools = {
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
  model: createLocalModel(),
  instructions,
  tools,
  stopWhen: stepCountIs(15),
  onStepFinish: ({ usage, stepNumber }) => {
    console.error(
      `Step ${stepNumber}: ${usage.inputTokens} input, ${usage.outputTokens} output, ${usage.inputTokenDetails.cacheReadTokens ?? 0} cached`,
    );
  },
  prepareCall: async (options) => {
    const pruned = options.messages
      ? pruneMessages({
          messages: options.messages,
          toolCalls: "before-last-3-messages",
        })
      : undefined;

    return {
      ...options,
      messages: pruned ? addCacheControl(pruned) : undefined,
    };
  },
});

const prompt = process.argv.slice(3).join(" ") || "Hello!";
const { text, steps } = await agent.generate({ prompt });
console.log(text);
console.log(`\n(${steps.length} steps)`);
