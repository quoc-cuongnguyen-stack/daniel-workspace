import { isSafe } from "./is-safe.ts";

export function runSelfTests(): void {
  const check = (c: string, want: boolean) => {
    if (isSafe(c) !== want) throw new Error(`isSafe(${JSON.stringify(c)}) !== ${want}`);
  };
  check("ls -la", true);
  check("lsof", false);
  check("rm -rf /", false);
  check("git status", true);
  check("git stash", false);
  check("cat index.ts", true);
  check("find lib -name '*.ts'", true);
  check("echo hello > scratch.txt", true);
  check("wc -l index.ts", true);
  check("whoami", false);
}

runSelfTests();
