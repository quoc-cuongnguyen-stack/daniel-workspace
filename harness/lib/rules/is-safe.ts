// `find` is here because the course puts it here. Note `find -exec` can still run
// anything, which a prefix list cannot catch.
export const SAFE_PREFIXES = [
  "ls",
  "cat",
  "echo",
  "pwd",
  "which",
  "find",
  "head",
  "tail",
  "wc",
  "git log",
  "git status",
  "git diff",
];

// ponytail: prefix+space, not a parser. `ls && rm` still matches `ls`. Split/AST if chaining becomes a problem.
export function isSafe(command: string, prefixes: readonly string[] = SAFE_PREFIXES) {
  const cmd = command.trim();
  return prefixes.some((prefix) => cmd === prefix || cmd.startsWith(prefix + " "));
}

{
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
