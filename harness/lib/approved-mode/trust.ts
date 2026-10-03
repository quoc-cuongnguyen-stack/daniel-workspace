import { SAFE_PREFIXES } from "../rules/is-safe.ts";

/** Commands the parent is willing to grant a spawned executor. */
export const PARENT_TRUST = [
  ...SAFE_PREFIXES,
  "npm test",
  "npm run build",
  "npx tsc",
] as const;

const VERIFY_ONLY = new Set(["npm test", "npm run build", "npx tsc", "git log", "git status", "git diff"]);

/**
 * depth 0 = parent. depth 1 = first executor (same set).
 * Deeper spawns shrink: verify-only, then nothing.
 * This harness does not give executors `task`, so depth stays 1.
 */
export function inheritTrust(parentTrust: readonly string[], depth: number): string[] {
  if (depth < 1) {
    throw new Error("inheritTrust is for spawned agents (depth >= 1)");
  }
  if (depth === 1) return [...parentTrust];
  if (depth === 2) {
    return parentTrust.filter((command) => VERIFY_ONLY.has(command));
  }
  return [];
}

{
  const first = inheritTrust(PARENT_TRUST, 1);
  if (first.length !== PARENT_TRUST.length) {
    throw new Error("first executor should inherit the full parent list");
  }
  const nested = inheritTrust(PARENT_TRUST, 2);
  if (!nested.includes("npx tsc") || nested.includes("find")) {
    throw new Error("nested executor should keep verify commands and drop find");
  }
  if (inheritTrust(PARENT_TRUST, 3).length !== 0) {
    throw new Error("depth 3+ should have empty trust");
  }
}
