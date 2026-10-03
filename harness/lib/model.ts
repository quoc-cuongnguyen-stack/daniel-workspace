import { createAnthropic } from "@ai-sdk/anthropic";

export const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5";
export const DEFAULT_EXPLORER_MODEL = "claude-haiku-4-5";
export const DEFAULT_EXECUTOR_MODEL = "claude-sonnet-4-6";

function anthropicHeaders(): Record<string, string> | undefined {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  if (!workspaceId) {
    return undefined;
  }
  return { "anthropic-workspace-id": workspaceId };
}

export function createModel(modelId = process.env.CLAUDE_MODEL ?? DEFAULT_CLAUDE_MODEL) {
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

  console.error(`Claude model: ${modelId}`);
  return anthropic(modelId);
}
