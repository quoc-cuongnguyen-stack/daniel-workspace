import type { LanguageModel } from "ai";

export type ModelProvider = "anthropic";

export type AgentRole =
  | "orchestrator"
  | "explorer"
  | "executor"
  | "reviewer";

export interface ModelSpec {
  provider: ModelProvider;
  modelId: string;
  raw: string;
}

export interface ResolvedModel {
  model: LanguageModel;
  spec: ModelSpec;
}

export type RoleModelSpecs = Record<AgentRole, string>;
