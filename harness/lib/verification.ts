import type { Sandbox } from "./sandbox/sandbox.ts";

export async function discoverGates(sandbox: Sandbox): Promise<string[]> {
    try {
        const raw = await sandbox.readFile("package.json");
        const pkg = JSON.parse(raw);
        const scripts = pkg.scripts ?? {};
        const gates: string[] = [];

        if (scripts.typecheck || scripts["type-check"]) {
            gates.push("npm run typecheck");
        } else if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
            gates.push("npx tsc --noEmit");
        }

        if (scripts.lint) gates.push("npm run lint");
        if (scripts.test) gates.push("npm test");
        if (scripts.build) gates.push("npm run build");

        return gates;
    } catch {
        return [];
    }
}

function fakeSandbox(readFile: Sandbox["readFile"]): Sandbox {
    return {
        type: "local",
        workingDirectory: ".",
        readFile,
        exec: async () => ({ stdout: "", exitCode: 0 }),
        stop: async () => {},
    };
}

{
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
