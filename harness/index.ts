import { ToolLoopAgent, pruneMessages, stepCountIs } from "ai";
import { readFileSync } from "node:fs";
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

const sandbox = await createSandboxByEnv(cwd);
const lifecycle: SandboxLifecycle = {};

console.error(`Sandbox: ${sandbox.type}`);

await lifecycle.afterStart?.(sandbox);

try {
  const model = createModel();
  const read = createReadTool(sandbox);
  const grep = createGrepTool(sandbox);
  const write = createWriteTool(sandbox as WritableSandbox);
  const bash = createBashTool(
    sandbox,
    createApproval({ mode: "interactive" }),
  );

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
  };

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

  const prompt = process.argv.slice(3).join(" ") || "Hello!";
  const { text, steps } = await agent.generate({ prompt });
  console.log(text);
  console.log(`\n(${steps.length} steps)`);
} finally {
  await lifecycle.beforeStop?.(sandbox);
  await sandbox.stop();
}
