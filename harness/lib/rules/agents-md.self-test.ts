import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectAgentsMd } from "./agents-md.ts";

export function runSelfTests(): void {
  const root = mkdtempSync(join(tmpdir(), "agents-md-"));
  try {
    mkdirSync(join(root, ".git"));
    writeFileSync(join(root, "AGENTS.md"), "use npm");
    mkdirSync(join(root, "packages", "app"), { recursive: true });
    writeFileSync(join(root, "packages", "app", "AGENTS.md"), "use pnpm");
    const deepest = collectAgentsMd(join(root, "packages", "app"));
    if (deepest !== "use pnpm") {
      throw new Error(`expected deepest only, got ${JSON.stringify(deepest)}`);
    }
    mkdirSync(join(root, "packages", "api"), { recursive: true });
    const fallback = collectAgentsMd(join(root, "packages", "api"));
    if (fallback !== "use npm") {
      throw new Error(`expected root fallback, got ${JSON.stringify(fallback)}`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

runSelfTests();
