import type { PlanApprovalMode } from "../approved-mode/plan-approval.ts";
import type { AgentRole } from "../model.types.ts";

export interface PromptContext {
  workingDirectory: string;
  sandboxType: string;
  toolNames: string[];
  agentRole?: AgentRole;
  gitBranch?: string;
  projectContext?: string;
  verificationCommands?: string[];
  allowedWritePaths?: string[];
  skills?: { name: string; description: string }[];
  planApprovalMode?: PlanApprovalMode;
}
