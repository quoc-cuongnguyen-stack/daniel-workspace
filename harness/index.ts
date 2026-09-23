import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import {
  type ModelMessage,
  ToolLoopAgent,
  pruneMessages,
  stepCountIs,
} from "ai";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRunId, logAuditEvent } from "./lib/audit/audit-log.ts";
import { maybeAddCacheControl } from "./lib/cache.ts";
import { buildOrchestratorPrompt } from "./lib/handle/system-prompt.ts";
import { consumeAndRenderStream } from "./lib/handle/render-stream.ts";
import { loadRoleModelSpecs, resolveModel } from "./lib/model.ts";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createJustBashSandbox } from "./lib/sandbox/sandbox-just-bash.ts";
import { createLocalSandbox } from "./lib/sandbox/sandbox-local.ts";
import type { Sandbox } from "./lib/sandbox/sandbox.ts";
import { discoverGates } from "./lib/verification.ts";
import { createRegistry, registerOrchestratorTools } from "./lib/tools/registry.ts";
import { discoverSkills } from "./lib/skills/skills.ts";

const runId = createRunId();

const { values, positionals } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== "--"),
  options: {
    sandbox: { type: "string", default: "local" },
    cwd: { type: "string" },
  },
  allowPositionals: true,
});

function resolveHarnessPaths(): { cwd: string; prompt: string } {
  if (values.cwd) {
    return {
      cwd: resolve(values.cwd),
      prompt: positionals.join(" ") || "Hello!",
    };
  }

  if (positionals.length > 0) {
    return {
      cwd: resolve(positionals[0]),
      prompt: positionals.slice(1).join(" ") || "Hello!",
    };
  }

  const envCwd = process.env.HARNESS_CWD?.trim();
  if (envCwd) {
    return {
      cwd: resolve(envCwd),
      prompt: "Hello!",
    };
  }

  return {
    cwd: process.cwd(),
    prompt: positionals.join(" ") || "Hello!",
  };
}

const { cwd, prompt } = resolveHarnessPaths();

if (!existsSync(cwd)) {
  console.error(`Working directory does not exist: ${cwd}`);
  console.error(
    "Fix HARNESS_CWD in harness/.env, pass a valid path, or use --cwd.",
  );
  process.exit(1);
}

if (!process.env.HARNESS_LOG_DIR?.trim()) {
  process.env.HARNESS_LOG_DIR = join(cwd, ".harness", "runs");
}

const roleModels = loadRoleModelSpecs();
const orchestratorSpec = roleModels.orchestrator;
const explorerSpec = roleModels.explorer;
const executorSpec = roleModels.executor;
const reviewerSpec = roleModels.reviewer;

const skillDirs = [
  join(cwd, "skills"),
  join(process.env.HOME ?? "", ".harness", "skills"),
];

async function sandboxFromFlag(name: string, dir: string): Promise<Sandbox> {
  if (name === "just-bash") return createJustBashSandbox(dir);
  return createLocalSandbox(dir);
}

console.error("Harness run:", runId);
console.error("Working directory:", cwd);
console.error("Sandbox:", values.sandbox);
console.error("Orchestrator:", orchestratorSpec);
console.error("Explorer:", explorerSpec);
console.error("Executor:", executorSpec);
console.error("Reviewer:", reviewerSpec);

const sandbox = await sandboxFromFlag(values.sandbox!, cwd);

const projectContext = collectAgentsMd(cwd);
const verificationCommands = await discoverGates(sandbox);

const skills = discoverSkills(skillDirs);
const registry = createRegistry();
registerOrchestratorTools(registry, sandbox, skills, {
  runId,
  verificationCommands,
});

const { model: orchestratorModel, spec: orchestratorMeta } =
  resolveModel(orchestratorSpec);

const agent = new ToolLoopAgent({
  model: orchestratorModel,
  instructions: buildOrchestratorPrompt({
    workingDirectory: cwd,
    sandboxType: sandbox.type,
    toolNames: registry.listTools(),
    agentRole: "orchestrator",
    projectContext,
    verificationCommands,
    skills: skills.map((s) => ({ name: s.name, description: s.description })),
  }),
  tools: Object.fromEntries(registry.entries()),
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
      messages: pruned ? maybeAddCacheControl(pruned) : undefined,
    };
  },
  prepareStep: ({ messages }) => ({
    messages: maybeAddCacheControl(
      pruneMessages({
        messages,
        toolCalls: "before-last-3-messages",
      }),
    ),
  }),
  onStepFinish: ({ usage, stepNumber }) => {
    logAuditEvent({
      runId,
      timestamp: new Date().toISOString(),
      role: "orchestrator",
      provider: orchestratorMeta.provider,
      model: orchestratorMeta.modelId,
      step: stepNumber,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
    console.error(
      `\nStep ${stepNumber}: ${usage.inputTokens} input, ${usage.outputTokens} output`,
    );
  },
});

process.on("SIGINT", async () => {
  console.error("\nShutting down...");
  await sandbox.stop();
  process.exit(0);
});

try {
  logAuditEvent({
    runId,
    timestamp: new Date().toISOString(),
    role: "orchestrator",
    provider: orchestratorMeta.provider,
    model: orchestratorMeta.modelId,
    message: sanitizePromptForLog(prompt),
  });

  const interactive = Boolean(process.stdin.isTTY);
  if (interactive) {
    console.error("(Session mode: type /quit to end.)");
  }

  let conversationMessages: ModelMessage[] | undefined;
  let turn = 0;

  while (true) {
    turn += 1;
    const result = conversationMessages
      ? await agent.stream({ messages: conversationMessages })
      : await agent.stream({ prompt });

    await consumeAndRenderStream(result.fullStream);
    const steps = await result.steps;
    console.error(`(${steps.length} steps)`);

    const response = await result.response;
    conversationMessages = conversationMessages
      ? [...conversationMessages, ...response.messages]
      : [{ role: "user", content: prompt }, ...response.messages];

    if (!interactive) {
      break;
    }

    const nextLine = await readReplLine();
    if (nextLine === null) {
      break;
    }
    const trimmed = nextLine.trim();
    if (trimmed === "/quit") {
      break;
    }
    if (!trimmed) {
      continue;
    }

    conversationMessages = [
      ...conversationMessages,
      { role: "user", content: trimmed },
    ];
  }

  console.error(`Audit log: ${process.env.HARNESS_LOG_DIR}/${runId}.json`);
  if (interactive && turn > 0) {
    console.error(`Session ended after ${turn} turn(s).`);
  }
} finally {
  await sandbox.stop();
}

async function readReplLine(): Promise<string | null> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    return null;
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await rl.question("> ");
  } finally {
    rl.close();
  }
}

function sanitizePromptForLog(text: string): string {
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
}
