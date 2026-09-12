import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { WritableSandbox } from "./sandbox.ts";

export function createLocalSandbox(dir: string): WritableSandbox {
  let inFlight: Promise<{ snapshotId: string }> | null = null;
  let stopped = false;

  return {
    type: "local",
    workingDirectory: dir,
    readFile: async (p) => readFileSync(resolve(dir, p), "utf-8"),
    writeFile: async (p, content) => {
      const abs = resolve(dir, p);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content, "utf-8");
    },
    exec: async (command) => {
      try {
        const stdout = execSync(command, {
          cwd: dir,
          encoding: "utf-8",
          timeout: 30_000,
        });
        return { stdout, exitCode: 0 };
      } catch (error) {
        const failed = error as {
          stdout?: string;
          stderr?: string;
          message?: string;
          status?: number | null;
        };
        return {
          stdout: failed.stdout || failed.stderr || failed.message || "",
          exitCode: failed.status ?? 1,
        };
      }
    },
    snapshot: async () => {
      if (inFlight) return inFlight;
      inFlight = Promise.resolve({ snapshotId: `local-${Date.now()}` });
      try {
        return await inFlight;
      } finally {
        inFlight = null;
      }
    },
    stop: async () => {
      if (stopped) return;
      stopped = true;
    },
  };
}
