export interface ToolCaps {
  /** Max lines returned by `read` after offset/limit. */
  readLines: number;
  /** Max matches returned by `grep`. */
  grepMatches: number;
  /** Max characters of `bash` stdout kept (tail). */
  bashChars: number;
}

// Defaults from the course: big enough for a main agent turn, small enough
// that one careless tool call cannot eat the context window. Override per
// agent — a quick subagent may want 100/20/2000; a deep pass may want 2000/200/20000.
export const DEFAULT_TOOL_CAPS: ToolCaps = {
  readLines: 500,
  grepMatches: 50,
  bashChars: 5_000,
};

export function resolveToolCaps(partial?: Partial<ToolCaps>): ToolCaps {
  return { ...DEFAULT_TOOL_CAPS, ...partial };
}
