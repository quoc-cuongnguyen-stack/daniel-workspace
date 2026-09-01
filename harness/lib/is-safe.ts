export const SAFE_PREFIXES = ["ls", "cat", "pwd", "git status", "git log", "git diff"];

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
}
