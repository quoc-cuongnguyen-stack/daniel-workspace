import type { Sandbox } from "./sandbox/sandbox.ts";
import { discoverGates } from "./verification.ts";

function fakeSandbox(readFile: Sandbox["readFile"]): Sandbox {
  return {
    type: "local",
    workingDirectory: ".",
    readFile,
    exec: async () => ({ stdout: "", exitCode: 0 }),
    stop: async () => {},
  };
}

export async function runSelfTests(): Promise<void> {
  const fromScripts = await discoverGates(fakeSandbox(async () =>
    JSON.stringify({
      scripts: { typecheck: "tsc --noEmit", lint: "eslint ." },
      devDependencies: { typescript: "5.9.3" },
    }),
  ));
  if (fromScripts.join(",") !== "npm run typecheck,npm run lint") {
    throw new Error(`expected typecheck then lint, got ${fromScripts.join(",")}`);
  }

  const typeCheckAlias = await discoverGates(fakeSandbox(async () =>
    JSON.stringify({ scripts: { "type-check": "tsc --noEmit" } }),
  ));
  if (typeCheckAlias.join(",") !== "npm run typecheck") {
    throw new Error(`expected type-check alias, got ${typeCheckAlias.join(",")}`);
  }

  const tscFallback = await discoverGates(fakeSandbox(async () =>
    JSON.stringify({ dependencies: { typescript: "5.9.3" } }),
  ));
  if (tscFallback.join(",") !== "npx tsc --noEmit") {
    throw new Error(`expected tsc fallback, got ${tscFallback.join(",")}`);
  }

  const missing = await discoverGates(fakeSandbox(async () => {
    throw new Error("ENOENT");
  }));
  if (missing.length !== 0) {
    throw new Error("missing package.json should yield no gates");
  }
}

await runSelfTests();
