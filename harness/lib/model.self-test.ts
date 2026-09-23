import {
  loadRoleModelSpecs,
  modelSpecForRole,
  parseModelSpec,
} from "./model.ts";
import { withEnv } from "./test/with-env.ts";

export function runSelfTests(): void {
  const bare = parseModelSpec("claude-haiku-4-5");
  if (bare.provider !== "anthropic" || bare.modelId !== "claude-haiku-4-5") {
    throw new Error("bare model id should default to anthropic provider");
  }

  for (const rejected of ["ollama/qwen2.5-coder:14b", "local/qwen-test", "unknown/model"]) {
    let threw = false;
    try {
      parseModelSpec(rejected);
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(`unsupported provider should throw for ${rejected}`);
    }
  }

  withEnv(
    {
      ORCHESTRATOR_MODEL: "anthropic/claude-sonnet-4-6",
      EXPLORER_MODEL: "anthropic/claude-haiku-4-5",
      EXECUTOR_MODEL: "anthropic/claude-sonnet-4-6",
      REVIEWER_MODEL: "anthropic/claude-opus-4-6",
    },
    () => {
      const specs = loadRoleModelSpecs();
      if (specs.orchestrator !== "anthropic/claude-sonnet-4-6") {
        throw new Error("orchestrator spec should come from env");
      }
      if (specs.explorer !== "anthropic/claude-haiku-4-5") {
        throw new Error("explorer spec should come from env");
      }
    },
  );

  withEnv(
    {
      ORCHESTRATOR_MODEL: undefined,
      EXPLORER_MODEL: "anthropic/claude-haiku-4-5",
      EXECUTOR_MODEL: "anthropic/claude-sonnet-4-6",
      REVIEWER_MODEL: "anthropic/claude-opus-4-6",
    },
    () => {
      let missing = false;
      try {
        modelSpecForRole("orchestrator");
      } catch (error) {
        missing =
          error instanceof Error &&
          error.message.includes("ORCHESTRATOR_MODEL");
      }
      if (!missing) {
        throw new Error("missing ORCHESTRATOR_MODEL should fail fast");
      }
    },
  );

  withEnv(
    {
      ORCHESTRATOR_MODEL: "   ",
      EXPLORER_MODEL: "anthropic/claude-haiku-4-5",
      EXECUTOR_MODEL: "anthropic/claude-sonnet-4-6",
      REVIEWER_MODEL: "anthropic/claude-opus-4-6",
    },
    () => {
      let empty = false;
      try {
        modelSpecForRole("orchestrator");
      } catch (error) {
        empty =
          error instanceof Error &&
          error.message.includes("ORCHESTRATOR_MODEL");
      }
      if (!empty) {
        throw new Error("empty ORCHESTRATOR_MODEL should fail fast");
      }
    },
  );
}

runSelfTests();
