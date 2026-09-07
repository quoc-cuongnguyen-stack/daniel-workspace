import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_BASE_URL = "http://127.0.0.1:1234/v1";
const DEFAULT_MODEL =
  "qwen3.5-9b-the-defiant-fable-uncensored-heretic-neo-imatrix-max-mtp";

export async function createLocalModel() {
  const baseURL = process.env.LOCAL_BASE_URL ?? DEFAULT_BASE_URL;
  const modelId = process.env.LOCAL_MODEL ?? DEFAULT_MODEL;

  await assertLocalServer(baseURL);

  const local = createOpenAICompatible({
    name: "bionic",
    baseURL,
    apiKey: process.env.LOCAL_API_KEY ?? "lm-studio",
  });

  console.error(`Local model: ${modelId} @ ${baseURL}`);
  return local(modelId);
}

async function assertLocalServer(baseURL: string) {
  try {
    const res = await fetch(`${baseURL}/models`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      throw new Error(`Local model server returned HTTP ${res.status} at ${baseURL}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Local model server returned")) {
      throw error;
    }
    throw new Error(
      `Local model server is not reachable at ${baseURL}. ` +
        `Bionic binds IPv4 only — use 127.0.0.1, not localhost. ` +
        `Start it with \`lms server start\` or Bionic → Local Model API.`,
    );
  }
}
