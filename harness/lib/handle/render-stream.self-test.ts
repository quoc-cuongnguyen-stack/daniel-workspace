import { renderToolCall, renderToolResult } from "./render-stream.ts";
import { showToolTrace } from "./tool-trace.ts";

export function runSelfTests(): void {
  const grepCall = renderToolCall("grep", { pattern: "TODO", glob: "*.ts" });
  if (!grepCall.includes("TODO") || !grepCall.includes("*.ts")) {
    throw new Error("grep call should include pattern and glob");
  }
  const grepResult = renderToolResult(
    "grep",
    { pattern: "TODO" },
    "src/auth.ts:42: // TODO: add rate limiting\nsrc/routes.ts:15: // TODO: validate input\n(2 matches)",
  );
  if (!grepResult.includes("2 matches") || !grepResult.includes("src/auth.ts")) {
    throw new Error("grep result should include count and first matches");
  }
  const readResult = renderToolResult(
    "read",
    { path: "index.ts" },
    "1: import x\n2: export y",
  );
  if (!readResult.includes("index.ts") || !readResult.includes("2 lines")) {
    throw new Error("read result should include path and line count");
  }
  const writeResult = renderToolResult(
    "write",
    { path: "notes.md", content: "hi" },
    "Wrote notes.md",
  );
  if (!writeResult.includes("notes.md") || !writeResult.includes("2 bytes")) {
    throw new Error("write result should include path and byte count");
  }
  const taskResult = renderToolResult(
    "task",
    { subagentType: "explorer" },
    "[explorer: 3 steps]\nfound files",
  );
  if (!taskResult.includes("explorer") || !taskResult.includes("3 steps")) {
    throw new Error("task result should include role and step count");
  }

  const savedTrace = process.env.HARNESS_SHOW_TOOL_TRACE;
  delete process.env.HARNESS_SHOW_TOOL_TRACE;
  if (showToolTrace()) {
    throw new Error("render-stream should respect quiet default for tool trace");
  }
  process.env.HARNESS_SHOW_TOOL_TRACE = "1";
  if (!showToolTrace()) {
    throw new Error("render-stream should allow opt-in tool trace");
  }
  if (savedTrace === undefined) {
    delete process.env.HARNESS_SHOW_TOOL_TRACE;
  } else {
    process.env.HARNESS_SHOW_TOOL_TRACE = savedTrace;
  }
}

runSelfTests();
