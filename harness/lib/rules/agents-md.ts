import { existsSync, readFileSync } from "node:fs";
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
