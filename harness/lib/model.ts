import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type {
  AgentRole,
  ModelSpec,
  ResolvedModel,
  RoleModelSpecs,
} from "./model.types.ts";

export type {
  AgentRole,
  ModelProvider,
  ModelSpec,
  ResolvedModel,
  RoleModelSpecs,
} from "./model.types.ts";

const ROLE_ENV_VAR: Record<AgentRole, string> = {
  orchestrator: "ORCHESTRATOR_MODEL",
  explorer: "EXPLORER_MODEL",
  executor: "EXECUTOR_MODEL",
  reviewer: "REVIEWER_MODEL",
};

function anthropicHeaders(): Record<string, string> | undefined {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (!workspaceId) {
    return undefined;
  }
  return { "anthropic-workspace-id": workspaceId };
}

export function roleEnvVar(role: AgentRole): string {
  return ROLE_ENV_VAR[role];
}

export function parseModelSpec(spec: string): ModelSpec {
  const trimmed = spec.trim();
  if (!trimmed) {
    throw new Error("Model spec must not be empty.");
  }

  const slash = trimmed.indexOf("/");
  if (slash === -1) {
    return {
      provider: "anthropic",
      modelId: trimmed,
      raw: `anthropic/${trimmed}`,
    };
  }

  const prefix = trimmed.slice(0, slash);
  const modelId = trimmed.slice(slash + 1);
  if (!modelId) {
    throw new Error(`Invalid model spec "${spec}": missing model id after provider.`);
  }

  if (prefix === "anthropic") {
    return { provider: "anthropic", modelId, raw: trimmed };
  }

  throw new Error(
    `Unsupported provider "${prefix}". Use anthropic/<model> or a bare Claude model id.`,
  );
}

export function modelSpecForRole(role: AgentRole): string {
  const envVar = ROLE_ENV_VAR[role];
  const value = process.env[envVar]?.trim();
  if (!value) {
    throw new Error(
      `${envVar} is missing or empty. Set all role models in harness/.env.`,
    );
  }
  return parseModelSpec(value).raw;
}

export function loadRoleModelSpecs(): RoleModelSpecs {
  return {
    orchestrator: modelSpecForRole("orchestrator"),
    explorer: modelSpecForRole("explorer"),
    executor: modelSpecForRole("executor"),
    reviewer: modelSpecForRole("reviewer"),
  };
}

function createAnthropicModel(modelId: string): LanguageModel {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing. Add it to harness/.env to use Claude.",
    );
  }

  const headers = anthropicHeaders();
  const anthropic = createAnthropic({
    apiKey,
    baseURL: "https://api.anthropic.com/v1",
    ...(headers ? { headers } : {}),
  });

  return anthropic(modelId);
}

export function resolveModel(spec: string): ResolvedModel {
  const parsed = parseModelSpec(spec);
  return { model: createAnthropicModel(parsed.modelId), spec: parsed };
}

export function createModel(spec: string): LanguageModel {
  return resolveModel(spec).model;
}

export function isAnthropicSpec(spec: string): boolean {
  return parseModelSpec(spec).provider === "anthropic";
}
