import { parseVerdict } from "./reviewer.ts";

export function runSelfTests(): void {
  const approved = parseVerdict("Verdict: approve\nSummary: All checks passed.");
  if (approved.verdict !== "approve") {
    throw new Error("expected approve verdict");
  }
  const rejected = parseVerdict("Verdict: reject\nSummary: Scope drift.");
  if (rejected.verdict !== "reject") {
    throw new Error("expected reject verdict");
  }
}

runSelfTests();
