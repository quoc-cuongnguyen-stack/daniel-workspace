import type { AgentRole, ModelProvider } from "../model.types.ts";

export interface AuditEvent {
  runId: string;
  timestamp: string;
  role: AgentRole;
  provider: ModelProvider;
  model: string;
  step?: number;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  tool?: string;
  inputSummary?: string;
  exitCode?: number;
  verificationStatus?: "passed" | "failed" | "skipped";
  decision?: string;
  message?: string;
}
