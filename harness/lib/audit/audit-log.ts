import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { AuditEvent } from "./audit.types.ts";

export type { AuditEvent } from "./audit.types.ts";

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]+/g,
  /ANTHROPIC_API_KEY=\S+/g,
  /api[_-]?key["']?\s*[:=]\s*["']?[^\s"']+/gi,
];

export function createRunId(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = Math.random().toString(36).slice(2, 8);
  return `run-${stamp}-${suffix}`;
}

export function sanitizeForLog(value: string, max = 240): string {
  let text = value;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  if (text.length > max) {
    return `${text.slice(0, max)}…`;
  }
  return text;
}

function logDirectory(): string {
  const configured = process.env.HARNESS_LOG_DIR?.trim();
  if (configured) {
    return configured;
  }
  return join(process.cwd(), ".harness", "runs");
}

export function auditLogPath(runId: string): string {
  return join(logDirectory(), `${runId}.json`);
}

function sanitizeEvent(event: AuditEvent): AuditEvent {
  return {
    ...event,
    inputSummary: event.inputSummary
      ? sanitizeForLog(event.inputSummary)
      : undefined,
    decision: event.decision ? sanitizeForLog(event.decision) : undefined,
    message: event.message ? sanitizeForLog(event.message) : undefined,
  };
}

function readAuditEvents(path: string): AuditEvent[] {
  if (!existsSync(path)) {
    return [];
  }
  const raw = readFileSync(path, "utf-8").trim();
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Audit log at ${path} is not a JSON array.`);
  }
  return parsed as AuditEvent[];
}

function writeAuditEvents(path: string, events: AuditEvent[]): void {
  writeFileSync(path, `${JSON.stringify(events, null, 2)}\n`, "utf-8");
}

// Appends a sanitized event to the run's audit log file, which is stored as a pretty-printed JSON array.
export function logAuditEvent(event: AuditEvent): void {
  const path = auditLogPath(event.runId);
  mkdirSync(logDirectory(), { recursive: true });

  const events = readAuditEvents(path);
  events.push(sanitizeEvent(event));
  writeAuditEvents(path, events);
}

export function summarizeToolInput(
  tool: string,
  input: Record<string, unknown>,
): string {
  if (tool === "task") {
    const subagentType = input.subagentType;
    if (typeof subagentType === "string") {
      return subagentType;
    }
  }
  return sanitizeForLog(JSON.stringify(input));
}
