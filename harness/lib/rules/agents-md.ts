import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";

function findGitRoot(start: string): string {
  let dir = resolve(start);
  const { root } = parse(dir);
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    if (dir === root) return resolve(start);
    dir = dirname(dir);
  }
}

function dirsFromCwdToRoot(cwd: string): string[] {
  const gitRoot = findGitRoot(cwd);
  const { root } = parse(gitRoot);
  const chain: string[] = [];
  let dir = resolve(cwd);
  while (true) {
    chain.push(dir);
    if (dir === gitRoot || dir === root) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return chain;
}

// Cursor: only the deepest AGENTS.md (cwd, then walk up). No concat with root.
export function collectAgentsMd(cwd: string): string | undefined {
  for (const dir of dirsFromCwdToRoot(cwd)) {
    const file = join(dir, "AGENTS.md");
    if (!existsSync(file)) continue;
    return readFileSync(file, "utf-8").trimEnd();
  }
  return undefined;
}

{
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
