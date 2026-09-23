import type { ModelMessage } from "ai";

const MAX_CACHE_BREAKPOINTS = 4;
const FRESH_TAIL = 2;

export function addCacheControl(messages: ModelMessage[]): ModelMessage[] {
  const cacheableCount = Math.max(0, messages.length - FRESH_TAIL);
  const breakpointCount = Math.min(MAX_CACHE_BREAKPOINTS, cacheableCount);

  return messages.map((msg, i) => {
    if (i >= breakpointCount) {
      return msg;
    }
    return {
      ...msg,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    };
  });
}

export function maybeAddCacheControl(messages: ModelMessage[]): ModelMessage[] {
  return addCacheControl(messages);
}
