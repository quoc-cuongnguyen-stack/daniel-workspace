import { createInterface } from "node:readline/promises";
import { isSafe, SAFE_PREFIXES } from "../rules/is-safe.ts";

export type ApprovalConfig =
  | { mode: "interactive" }
  | { mode: "background" }
  | { mode: "delegated"; trust: string[] };

export type ApprovalGate = {
  needsApproval: (input: { command: string }) => boolean;
  remember: (command: string) => void;
  tryApprove: (command: string) => Promise<boolean>;
  listSessionTrust: () => string[];
  formatTrustList: () => string;
};

export function createApproval(config: ApprovalConfig): ApprovalGate {
  // Exact commands only. Approving `npm install express` must not unlock `npm install`.
  const sessionTrust = new Set<string>();

  const inSession = (command: string) => sessionTrust.has(command.trim());

  const needsApproval = ({ command }: { command: string }) => {
    if (config.mode === "background") return false;
    if (config.mode === "interactive" && inSession(command)) return false;

    if (config.mode === "delegated") {
      return !isSafe(command, config.trust);
    }

    return !isSafe(command, SAFE_PREFIXES);
  };

  const remember = (command: string) => {
    sessionTrust.add(command.trim());
  };

  return {
    needsApproval,
    remember,
    async tryApprove(command) {
      if (config.mode !== "interactive") return false;
      if (inSession(command) || isSafe(command, SAFE_PREFIXES)) return true;
      const ok = await promptAllow(command);
      if (ok) remember(command);
      return ok;
    },
    listSessionTrust: () => [...sessionTrust].sort(),
    formatTrustList() {
      const session = [...sessionTrust].sort();
      return [
        "Always allowed:",
        ...SAFE_PREFIXES.map((p) => `  ${p}`),
        "Session:",
        ...(session.length ? session.map((p) => `  ${p}`) : ["  (none)"]),
      ].join("\n");
    },
  };
}

async function promptAllow(command: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    console.error(`[approval] deny (no TTY): ${command}`);
    return false;
  }
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question(
      `The agent wants to run \`${command}\`. Allow for this session? [y/N] `,
    );
    return /^\s*y(es)?\s*$/i.test(answer);
  } finally {
    rl.close();
  }
}

{
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
