/** When true, print tool call/result activity to stderr. Default: off. */
export function showToolTrace(): boolean {
  const raw = process.env.HARNESS_SHOW_TOOL_TRACE?.trim();
  if (!raw) {
    return false;
  }
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

export function traceToolActivity(message: string): void {
  if (showToolTrace()) {
    console.error(message);
  }
}
