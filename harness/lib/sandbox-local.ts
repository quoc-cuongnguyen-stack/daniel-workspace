import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { WritableSandbox } from "./sandbox.ts";

export function createLocalSandbox(dir: string): WritableSandbox {
  return {
    type: "local",
    workingDirectory: dir,
    readFile: async (p) => readFileSync(resolve(dir, p), "utf-8"),
    writeFile: async (p, content) => {
      writeFileSync(resolve(dir, p), content, "utf-8");
    },
    exec: async (command) => {
      try {
        const stdout = execSync(command, {
          cwd: dir,
          encoding: "utf-8",
          timeout: 30_000,
          maxBuffer: 8_000_000,
          stdio: ["ignore", "pipe", "pipe"],
        });
        return { stdout, exitCode: 0 };
      } catch (err) {
        const failure = err as {
          status?: number | null;
          stdout?: string;
          stderr?: string;
          message?: string;
          killed?: boolean;
        };
        if (failure.killed) {
          return { stdout: "(timed out)", exitCode: 124 };
        }
        return {
          stdout: (failure.stdout || failure.stderr || failure.message || "").trim(),
          exitCode: failure.status ?? 1,
        };
      }
    },
    stop: async () => {},
  };
}
