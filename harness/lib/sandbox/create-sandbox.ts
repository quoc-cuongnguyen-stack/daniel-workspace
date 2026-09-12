import { createJustBashSandbox } from "./sandbox-just-bash.ts";
import { createLocalSandbox } from "./sandbox-local.ts";
import type { Sandbox } from "./sandbox.ts";

export async function createSandboxByEnv(dir: string): Promise<Sandbox> {
  const type = process.env.SANDBOX || "local";
  switch (type) {
    case "just-bash":
      return createJustBashSandbox(dir);
    case "local":
      return createLocalSandbox(dir);
    default:
      throw new Error(`Unknown SANDBOX: ${type}. Use "local" or "just-bash".`);
  }
}
