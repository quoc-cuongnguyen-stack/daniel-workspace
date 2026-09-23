import { inheritTrust, PARENT_TRUST } from "./trust.ts";

export function runSelfTests(): void {
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

runSelfTests();
