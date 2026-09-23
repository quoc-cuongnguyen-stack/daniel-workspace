import { createApproval, type ApprovalGate } from "./mode-approval.ts";

export function runSelfTests(): void {
  const interactive = createApproval({ mode: "interactive" });
  const background = createApproval({ mode: "background" });
  const delegated = createApproval({ mode: "delegated", trust: ["pwd", "git status"] });

  const check = (
    gate: ApprovalGate,
    command: string,
    want: boolean,
  ) => {
    if (gate.needsApproval({ command }) !== want) {
      throw new Error(`${command} expected needsApproval=${want}`);
    }
  };

  check(interactive, "ls -la", false);
  check(interactive, "rm -rf /", true);
  check(background, "rm -rf /", false);
  check(delegated, "pwd", false);
  check(delegated, "ls -la", true);

  check(interactive, "npm test", true);
  interactive.remember("npm test");
  check(interactive, "npm test", false);
  check(interactive, "npm test --watch", true);

  interactive.remember("npm install express");
  check(interactive, "npm install express", false);
  check(interactive, "npm install lodash", true);
}

runSelfTests();
