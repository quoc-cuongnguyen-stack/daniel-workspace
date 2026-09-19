import { parseArgs } from "node:util";
import { ToolLoopAgent, pruneMessages, stepCountIs, tool } from "ai";
import { join, resolve } from "node:path";
import { addCacheControl } from "./lib/cache.ts";
import { createModel } from "./lib/model.ts";
import { collectAgentsMd } from "./lib/rules/agents-md.ts";
import { createApproval } from "./lib/approved-mode/mode-approval.ts";
import { buildSystemPrompt } from "./lib/handle/system-prompt.ts";
import { createJustBashSandbox } from "./lib/sandbox/sandbox-just-bash.ts";
import { createLocalSandbox } from "./lib/sandbox/sandbox-local.ts";
import type { Sandbox } from "./lib/sandbox/sandbox.ts";
import { discoverGates } from "./lib/verification.ts";
import { createRegistry, registerBuiltins, wrapTool } from "./lib/tools/registry.ts";
import { discoverSkills } from "./lib/skills/skills.ts";
import { z } from "zod";


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

const skillDirs = [
  join(cwd, "skills"),
  join(process.env.HOME ?? "", ".harness", "skills"),
];

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

const skills = discoverSkills(skillDirs);
const registry = createRegistry();
registerBuiltins(registry, sandbox, skills, approval);

registry.registerTool("deploy", tool({
  description: `Deploy the project to a target environment.
  WHEN TO USE: pushing changes to staging or production.
  WHEN NOT TO USE: testing changes (use bash with the test runner instead).`,
  inputSchema: z.object({
    environment: z.enum(["staging", "production"]),
  }),
  execute: async ({ environment }) => {
    const { stdout } = await sandbox.exec(`vercel deploy --${environment}`);
    return stdout;
  },
}));

const baseBash = registry.getTool("bash")!;
  registry.registerTool("bash", wrapTool(baseBash, {
  beforeExecute: (input: { command: string }) => {
    if (input.command.startsWith("bun test")) {
      return { ...input, command: input.command + " --reporter=spec" };
    }
    return input;
  },
}));

registry.registerTool("now", tool({
  description: "Return the current timestamp",
  inputSchema: z.object({}),
  execute: async () => new Date().toISOString(),
}));

const agent = new ToolLoopAgent({
  model: createModel(modelIdFromFlag(values.model!)),
  instructions: buildSystemPrompt({
    workingDirectory: cwd,
    sandboxType: sandbox.type,
    toolNames: registry.listTools(),
    projectContext,
    verificationCommands,
    skills: skills.map((s) => ({ name: s.name, description: s.description }))
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
