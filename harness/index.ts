import { parseArgs } from "node:util";
import { ToolLoopAgent, pruneMessages, stepCountIs } from "ai";
import { resolve } from "node:path";
import { addCacheControl } from "./lib/cache.ts";
import { createModel } from "./lib/model.ts";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createApproval } from "./lib/approved-mode/mode-approval.ts";
import { PARENT_TRUST } from "./lib/approved-mode/trust.ts";
import { buildSystemPrompt } from "./lib/handle/system-prompt.ts";
import { createJustBashSandbox } from "./lib/sandbox/sandbox-just-bash.ts";
import { createLocalSandbox } from "./lib/sandbox/sandbox-local.ts";
import type { Sandbox, WritableSandbox } from "./lib/sandbox/sandbox.ts";
import { createAskUserTool } from "./lib/tools/ask.ts";
import { createBashTool } from "./lib/tools/bash.ts";
import { createGrepTool } from "./lib/tools/grep.ts";
import { createReadTool } from "./lib/tools/read.ts";
import { createSurveyTool } from "./lib/tools/survey.ts";
import { createTaskTool } from "./lib/tools/task.ts";
import { createTodoTool } from "./lib/tools/todo.ts";
import { createWriteTool } from "./lib/tools/write.ts";
import { discoverGates } from "./lib/verification.ts";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    sandbox: { type: "string", default: "local" },
    model: { type: "string", default: "anthropic/claude-haiku-4-5" },
  },
  allowPositionals: true,
});

const cwd = resolve(positionals[0] || process.cwd());
const prompt = positionals.slice(1).join(" ") || "Hello!";

async function sandboxFromFlag(name: string, dir: string): Promise<Sandbox> {
  if (name === "just-bash") return createJustBashSandbox(dir);
  return createLocalSandbox(dir);
}

function modelIdFromFlag(flag: string): string {
  const slash = flag.lastIndexOf("/");
  return slash === -1 ? flag : flag.slice(slash + 1);
}

const sandbox = await sandboxFromFlag(values.sandbox!, cwd);
console.error(`Sandbox: ${sandbox.type}`);

const projectContext = collectAgentsMd(cwd);
const verificationCommands = await discoverGates(sandbox);
const approval = createApproval({ mode: "interactive" });
for (const command of verificationCommands) {
  approval.remember(command);
}

const read = createReadTool(sandbox);
const grep = createGrepTool(sandbox);
const write = createWriteTool(sandbox as WritableSandbox);
const bash = createBashTool(sandbox, approval);
const tools = {
  read,
  grep,
  write,
  bash,
  task: createTaskTool(sandbox, { read, grep, write }, {
    trust: PARENT_TRUST,
    depth: 0,
    parentRole: "orchestrator",
  }),
  askUser: createAskUserTool(),
  survey: createSurveyTool(sandbox, { read, grep }),
  todo: createTodoTool(),
};

const agent = new ToolLoopAgent({
  model: createModel(modelIdFromFlag(values.model!)),
  instructions: buildSystemPrompt({
    workingDirectory: cwd,
    sandboxType: sandbox.type,
    toolNames: Object.keys(tools),
    projectContext,
    verificationCommands,
  }),
  tools,
  stopWhen: stepCountIs(15),
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
  prepareStep: ({ messages }) => ({
    messages: addCacheControl(
      pruneMessages({
        messages,
        toolCalls: "before-last-3-messages",
      }),
    ),
  }),
  onStepFinish: ({ usage, stepNumber }) => {
    console.error(
      `Step ${stepNumber}: ${usage.inputTokens} input, ${usage.outputTokens} output`,
    );
  },
});

process.on("SIGINT", async () => {
  console.error("\nShutting down...");
  await sandbox.stop();
  process.exit(0);
});

try {
  const { text, steps } = await agent.generate({ prompt });
  console.log(text);
  console.log(`\n(${steps.length} steps)`);
} finally {
  await sandbox.stop();
}
