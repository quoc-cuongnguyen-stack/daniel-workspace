import { isSafe, SAFE_PREFIXES } from "./is-safe.ts";

export type ApprovalConfig =
  | { mode: "interactive" }
  | { mode: "background" }
  | { mode: "delegated"; trust: string[] };

export function createApproval(config: ApprovalConfig) {
  return ({ command }: { command: string }) => {
    if (config.mode === "background") return false;

    if (config.mode === "delegated") {
      return !isSafe(command, config.trust);
    }

    return !isSafe(command, SAFE_PREFIXES);
  };
}

