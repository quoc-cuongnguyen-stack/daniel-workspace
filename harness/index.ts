import { ToolLoopAgent, pruneMessages, stepCountIs } from "ai";
import { resolve } from "node:path";
import { addCacheControl } from "./lib/cache.ts";
import { createModel } from "./lib/model.ts";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createSandboxByEnv } from "./lib/sandbox/create-sandbox.ts";
import type { SandboxLifecycle, WritableSandbox } from "./lib/sandbox/sandbox.ts";
import { buildSystemPrompt } from "./lib/handle/system-prompt.ts";
import { createBashTool } from "./lib/tools/bash.ts";
import { createGrepTool } from "./lib/tools/grep.ts";
import { createApproval } from "./lib/approved-mode/mode-approval.ts";
import { PARENT_TRUST } from "./lib/approved-mode/trust.ts";
import { createReadTool } from "./lib/tools/read.ts";
import { createTaskTool } from "./lib/tools/task.ts";
import { createWriteTool } from "./lib/tools/write.ts";
import { createAskUserTool } from "./lib/tools/ask.ts";
import { createSurveyTool } from "./lib/tools/survey.ts";
import { createTodoTool } from "./lib/tools/todo.ts";
import { discoverGates } from "./lib/verification.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const cwd = resolve(args[0] || process.cwd());
const projectContext = collectAgentsMd(cwd);
const sandbox = await createSandboxByEnv(cwd);
const verificationCommands = await discoverGates(sandbox);
const approval = createApproval({ mode: "interactive" });
for (const command of verificationCommands) {
  approval.remember(command);
}
const lifecycle: SandboxLifecycle = {};

console.error(`Sandbox: ${sandbox.type}`);

await lifecycle.afterStart?.(sandbox);

try {
  const model = createModel();
  const read = createReadTool(sandbox);
  const grep = createGrepTool(sandbox);
  const write = createWriteTool(sandbox as WritableSandbox);
  const bash = createBashTool(sandbox, approval);
  const askUser = createAskUserTool();
  const survey = createSurveyTool(sandbox, { read, grep });
  const todo = createTodoTool();

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
    askUser,
    survey,
    todo,
  };

  const instructions = buildSystemPrompt({
    workingDirectory: cwd,
    sandboxType: sandbox.type,
    toolNames: Object.keys(tools),
    projectContext,
    verificationCommands,
  });

  const agent = new ToolLoopAgent({
    model,
    instructions,
    tools,
    stopWhen: stepCountIs(15),
    onStepFinish: ({ usage, stepNumber }) => {
      console.error(
        `Step ${stepNumber}: ${usage.inputTokens} input, ${usage.outputTokens} output`,
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
    prepareStep: ({ messages }) => ({
      messages: addCacheControl(
        pruneMessages({
          messages,
          toolCalls: "before-last-3-messages",
        }),
      ),
    }),
  });

  const prompt = args.slice(1).join(" ") || "Hello!";
  const { text, steps } = await agent.generate({ prompt });
  console.log(text);
  console.log(`\n(${steps.length} steps)`);
} finally {
  await lifecycle.beforeStop?.(sandbox);
  await sandbox.stop();
}
