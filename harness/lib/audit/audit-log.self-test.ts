import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditLogPath,
  createRunId,
  logAuditEvent,
  sanitizeForLog,
  summarizeToolInput,
} from "./audit-log.ts";

export function runSelfTests(): void {
  const runId = createRunId();
  if (!runId.startsWith("run-")) {
    throw new Error("createRunId should return run- prefix");
  }

  const redacted = sanitizeForLog("token sk-ant-api03-secret");
  if (redacted.includes("sk-ant")) {
    throw new Error("sanitizeForLog should redact api keys");
  }

  if (summarizeToolInput("task", { subagentType: "executor" }) !== "executor") {
    throw new Error("task tool input summary should prefer subagentType");
  }

  const dir = mkdtempSync(join(tmpdir(), "harness-audit-"));
  const savedLogDir = process.env.HARNESS_LOG_DIR;
  process.env.HARNESS_LOG_DIR = dir;
  try {
    const testRunId = "run-self-test";
    logAuditEvent({
      runId: testRunId,
      timestamp: new Date().toISOString(),
      role: "orchestrator",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      message: "first",
    });
    logAuditEvent({
      runId: testRunId,
      timestamp: new Date().toISOString(),
      role: "orchestrator",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      message: "second",
    });

    const path = auditLogPath(testRunId);
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown[];
    if (parsed.length !== 2) {
      throw new Error("audit log should append events to a JSON array");
    }
    const pretty = readFileSync(path, "utf-8");
    if (!pretty.includes("\n  ")) {
      throw new Error("audit log should be pretty-printed JSON");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (savedLogDir === undefined) {
      delete process.env.HARNESS_LOG_DIR;
    } else {
      process.env.HARNESS_LOG_DIR = savedLogDir;
    }
  }
}

runSelfTests();
