import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "http://localhost:1234/v1";
const DEFAULT_MODEL =
  "qwen3.5-9b-the-defiant-fable-uncensored-heretic-neo-imatrix-max-mtp";

export function createLocalModel() {
  const baseURL = process.env.LOCAL_BASE_URL ?? DEFAULT_BASE_URL;
  const modelId = process.env.LOCAL_MODEL ?? DEFAULT_MODEL;

  const local = createOpenAICompatible({
    name: "bionic",
    baseURL,
    apiKey: process.env.LOCAL_API_KEY ?? "lm-studio",
  });

  console.error(`Local model: ${modelId} @ ${baseURL}`);
  return local(modelId);
}
