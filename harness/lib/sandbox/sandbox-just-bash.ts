import { Sandbox as JustBashSandbox } from "just-bash";
import { Sandbox } from "./sandbox.ts";

const MOUNT = "/home/user/project";

// just-bash hardens itself by patching Module._resolveFilename, which Bun refuses.
// Keep that secondary layer on Node; drop it under Bun so runCommand works at all.
const isBun = typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";

export async function createJustBashSandbox(dir: string): Promise<Sandbox> {
    const jb = await JustBashSandbox.create({
        overlayRoot: dir,
        defenseInDepth: !isBun,
    });

    return {
    type: "just-bash",
    workingDirectory: dir,
    readFile: async (p) => {
        const virtualPath = `${MOUNT}/${p}`;
        return jb.readFile(virtualPath);
    },
    exec: async (command) => {
        const cmd = await jb.runCommand(command, { cwd: MOUNT });
        const finished = await cmd.wait();
        return {
        stdout: await cmd.output(),
        exitCode: finished.exitCode,
        };
    },
    stop: async () => {},
    };
}