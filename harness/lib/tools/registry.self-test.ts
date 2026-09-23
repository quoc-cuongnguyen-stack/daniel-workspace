import type { Sandbox } from "../sandbox/sandbox.ts";
import {
  createRegistry,
  ORCHESTRATOR_TOOL_NAMES,
  registerOrchestratorTools,
} from "./registry.ts";

export function runSelfTests(): void {
  const registry = createRegistry();
  const sandbox: Sandbox = {
    type: "local",
    workingDirectory: ".",
    readFile: async () => "",
    exec: async () => ({ stdout: "", exitCode: 0 }),
    stop: async () => {},
  };
  registerOrchestratorTools(registry, sandbox, [], { runId: "test" });
  if (registry.hasTool("write") || registry.hasTool("bash")) {
    throw new Error("orchestrator registry must not expose write or bash");
  }
  if (!registry.hasTool("todo")) {
    throw new Error("orchestrator registry must expose todo");
  }
  for (const name of ORCHESTRATOR_TOOL_NAMES) {
    if (!registry.hasTool(name)) {
      throw new Error(`orchestrator missing tool ${name}`);
    }
  }
}

runSelfTests();
