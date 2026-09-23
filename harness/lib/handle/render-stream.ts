import type { TextStreamPart, ToolSet } from "ai";
import { showToolTrace } from "./tool-trace.ts";

const PREVIEW_CHARS = 100;

function preview(value: unknown, max = PREVIEW_CHARS): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return "";
  return text.length > max ? text.slice(0, max) : text;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function lineCount(output: unknown): number {
  if (typeof output !== "string" || output.length === 0) return 0;
  return output.split("\n").filter((line) => line && !line.startsWith("...")).length;
}

function grepSummary(output: unknown): string {
  const text = typeof output === "string" ? output : "";
  const countMatch = text.match(/\((\d+) matches/);
  const count = countMatch?.[1] ?? "0";
  const first = text
    .split("\n")
    .filter((line) => line.length > 0 && !line.startsWith("("))
    .slice(0, 3);
  if (first.length === 0) return `${count} matches`;
  return `${count} matches; ${first.join(" | ")}`;
}

function taskSummary(output: unknown): string {
  const text = typeof output === "string" ? output : "";
  const match = text.match(/^\[(\w+): (\d+) steps\]/);
  if (match) return `${match[1]}, ${match[2]} steps`;
  return preview(output);
}

function byteCount(input: Record<string, unknown>): number {
  const content = input.content;
  return typeof content === "string" ? Buffer.byteLength(content) : 0;
}

export function renderToolCall(toolName: string, input: unknown): string {
  const args = asRecord(input);
  switch (toolName) {
    case "read":
      return `[tool] read ${String(args.path ?? "")}`;
    case "grep":
      return `[tool] grep ${JSON.stringify(args.pattern ?? "")}${
        args.glob ? ` glob=${String(args.glob)}` : ""
      }`;
    case "bash":
      return `[tool] bash ${JSON.stringify(args.command ?? "")}`;
    case "write":
      return `[tool] write ${String(args.path ?? "")}`;
    case "task":
      return `[tool] task ${String(args.subagentType ?? "explorer")}`;
    case "askUser":
      return `[tool] askUser ${String(args.question ?? "")}`;
    case "survey":
      return `[tool] survey ${JSON.stringify(args.question ?? "")}`;
    case "todo":
      return `[tool] todo ${String(args.action ?? "")}`;
    case "loadSkill":
      return `[tool] loadSkill ${String(args.name ?? "")}`;
    case "deploy":
      return `[tool] deploy ${String(args.environment ?? "")}`;
    case "now":
      return `[tool] now`;
    default:
      return `[tool] ${toolName}(${JSON.stringify(input)})`;
  }
}

export function renderToolResult(
  toolName: string,
  input: unknown,
  output: unknown,
): string {
  const args = asRecord(input);
  switch (toolName) {
    case "read":
      return `${String(args.path ?? "")}: ${lineCount(output)} lines`;
    case "grep":
      return grepSummary(output);
    case "bash":
      return preview(output);
    case "write":
      return `${String(args.path ?? "")}, ${byteCount(args)} bytes`;
    case "task":
      return taskSummary(output);
    case "askUser": {
      const options = Array.isArray(args.options)
        ? args.options.map(String).join(" | ")
        : "";
      return options
        ? `${String(args.question ?? "")} [${options}]`
        : String(args.question ?? preview(output));
    }
    case "survey":
      return taskSummary(output);
    case "todo":
      return preview(output);
    case "loadSkill":
      return `${String(args.name ?? "")}: ${lineCount(output)} lines`;
    case "deploy":
      return preview(output);
    case "now":
      return typeof output === "string" ? output : preview(output);
    default:
      return preview(output);
  }
}

export function renderStreamChunk(chunk: TextStreamPart<ToolSet>): void {
  switch (chunk.type) {
    case "text-delta":
      process.stdout.write(chunk.text);
      return;
    case "tool-call":
      if (showToolTrace()) {
        console.error(`\n${renderToolCall(chunk.toolName, chunk.input)}`);
      }
      return;
    case "tool-result":
      if (showToolTrace()) {
        console.error(
          `  -> ${renderToolResult(chunk.toolName, chunk.input, chunk.output)}`,
        );
      }
      return;
    case "tool-error":
      console.error(`  -> error: ${preview(chunk.error)}`);
      return;
    case "error":
      console.error(`\n[error] ${preview(chunk.error)}`);
      return;
    case "text-start":
    case "text-end":
    case "reasoning-start":
    case "reasoning-end":
    case "reasoning-delta":
    case "custom":
    case "tool-input-start":
    case "tool-input-end":
    case "tool-input-delta":
    case "source":
    case "file":
    case "reasoning-file":
    case "tool-output-denied":
    case "tool-approval-request":
    case "tool-approval-response":
    case "start-step":
    case "finish-step":
    case "start":
    case "finish":
    case "abort":
    case "raw":
      return;
    default: {
      const _exhaustive: never = chunk;
      return _exhaustive;
    }
  }
}

export async function consumeAndRenderStream(
  stream: AsyncIterable<TextStreamPart<ToolSet>>,
): Promise<void> {
  for await (const chunk of stream) {
    renderStreamChunk(chunk);
  }
  console.log();
}
