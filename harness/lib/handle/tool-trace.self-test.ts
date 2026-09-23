import { showToolTrace } from "./tool-trace.ts";

export function runSelfTests(): void {
  const saved = process.env.HARNESS_SHOW_TOOL_TRACE;

  delete process.env.HARNESS_SHOW_TOOL_TRACE;
  if (showToolTrace()) {
    throw new Error("tool trace should be off by default");
  }

  process.env.HARNESS_SHOW_TOOL_TRACE = "0";
  if (showToolTrace()) {
    throw new Error("HARNESS_SHOW_TOOL_TRACE=0 should disable trace");
  }

  process.env.HARNESS_SHOW_TOOL_TRACE = "1";
  if (!showToolTrace()) {
    throw new Error("HARNESS_SHOW_TOOL_TRACE=1 should enable trace");
  }

  process.env.HARNESS_SHOW_TOOL_TRACE = "true";
  if (!showToolTrace()) {
    throw new Error("HARNESS_SHOW_TOOL_TRACE=true should enable trace");
  }

  if (saved === undefined) {
    delete process.env.HARNESS_SHOW_TOOL_TRACE;
  } else {
    process.env.HARNESS_SHOW_TOOL_TRACE = saved;
  }
}

runSelfTests();
